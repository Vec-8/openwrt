#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Valide hors ligne une image BIX OpenWrt et son manifeste de paquets."""

from __future__ import annotations

import argparse
import hashlib
import json
import lzma
import pathlib
import sys

from bix_tool import HEADER_SIZE, inspect, parse_header


def manifest_packages(path: pathlib.Path) -> set[str]:
    packages: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        packages.add(line.split()[0])
    return packages


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, type=pathlib.Path)
    parser.add_argument("--manifest", required=True, type=pathlib.Path)
    parser.add_argument("--magic", default="0x83800000")
    parser.add_argument("--max-size", type=lambda value: int(value, 0), default=12 * 1024 * 1024)
    parser.add_argument("--require-package", action="append", default=[])
    parser.add_argument("--require-kernel-string", action="append", default=[])
    parser.add_argument(
        "--allow-missing-squashfs",
        action="store_true",
        help="autorise une image sans rootfs SquashFS ajouté après le noyau",
    )
    args = parser.parse_args()

    raw = args.image.read_bytes()
    metadata = inspect(args.image)
    header = parse_header(raw)
    payload_end = HEADER_SIZE + int(header["data_size"])
    compressed_kernel = raw[HEADER_SIZE:payload_end]
    kernel = lzma.decompress(compressed_kernel, format=lzma.FORMAT_ALONE)
    squashfs_offset = raw.find(b"hsqs", payload_end)

    packages = manifest_packages(args.manifest)
    missing = sorted(set(args.require_package) - packages)
    required_kernel_strings = {
        value: value.encode("utf-8") in kernel for value in args.require_kernel_string
    }
    checks = {
        "image_exists": args.image.is_file(),
        "manifest_exists": args.manifest.is_file(),
        "size_within_limit": args.image.stat().st_size <= args.max_size,
        "magic_matches": metadata["magic"].lower() == args.magic.lower(),
        "header_crc_valid": metadata["header_crc_valid"],
        "data_crc_valid": metadata["data_crc_valid"],
        "data_size_valid": metadata["data_size_valid"],
        "required_packages_present": not missing,
        "kernel_lzma_decompressed": bool(kernel),
        "required_kernel_strings_present": all(required_kernel_strings.values()),
        "squashfs_after_kernel_payload": (
            args.allow_missing_squashfs or squashfs_offset >= payload_end
        ),
    }
    result = {
        "image": str(args.image),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "file_size": args.image.stat().st_size,
        "max_size": args.max_size,
        "bix": metadata,
        "kernel": {
            "compressed_size": len(compressed_kernel),
            "uncompressed_size": len(kernel),
            "sha256": hashlib.sha256(kernel).hexdigest(),
            "required_strings": required_kernel_strings,
        },
        "rootfs": {
            "squashfs_magic_found": squashfs_offset >= 0,
            "squashfs_offset": squashfs_offset if squashfs_offset >= 0 else None,
            "located_after_kernel_payload": squashfs_offset >= payload_end,
        },
        "manifest": str(args.manifest),
        "required_packages": args.require_package,
        "missing_packages": missing,
        "checks": checks,
        "valid": all(checks.values()),
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, lzma.LZMAError) as error:
        print(f"erreur: {error}", file=sys.stderr)
        raise SystemExit(1)
