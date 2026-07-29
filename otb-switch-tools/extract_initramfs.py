#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Repère le gzip initramfs dans l'image noyau décompressée.

Le script valide le flux gzip en cherchant une archive CPIO ``newc`` terminée
par ``TRAILER!!!``. Il évite ainsi de confondre les signatures gzip présentes
par hasard dans le noyau.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import stat
import struct
import sys
import zlib


GZIP_MAGIC = b"\x1f\x8b\x08"
CPIO_MAGIC = b"070701"


def align4(value: int) -> int:
    return (value + 3) & ~3


def parse_newc(raw: bytes) -> list[dict[str, object]]:
    offset = 0
    entries: list[dict[str, object]] = []
    while offset + 110 <= len(raw):
        if raw[offset : offset + 6] != CPIO_MAGIC:
            raise ValueError(f"magic CPIO absente à 0x{offset:x}")
        fields = [
            int(raw[offset + 6 + index * 8 : offset + 14 + index * 8], 16)
            for index in range(13)
        ]
        (
            inode,
            mode,
            uid,
            gid,
            nlink,
            mtime,
            file_size,
            dev_major,
            dev_minor,
            rdev_major,
            rdev_minor,
            name_size,
            check,
        ) = fields
        name_start = offset + 110
        name_end = name_start + name_size
        name = raw[name_start:name_end].rstrip(b"\0").decode(
            "utf-8", errors="surrogateescape"
        )
        data_start = align4(name_end)
        data_end = data_start + file_size
        entries.append(
            {
                "name": name,
                "mode": mode,
                "uid": uid,
                "gid": gid,
                "mtime": mtime,
                "size": file_size,
                "data_start": data_start,
                "data_end": data_end,
            }
        )
        offset = align4(data_end)
        if name == "TRAILER!!!":
            return entries
    raise ValueError("fin TRAILER!!! absente de l'archive CPIO")


def extract_regular_entries(
    raw: bytes, entries: list[dict[str, object]], destination: pathlib.Path
) -> None:
    """Extrait répertoires, fichiers et liens, sans créer de périphériques."""

    destination.mkdir(parents=True, exist_ok=True)
    root = destination.resolve()
    for entry in entries:
        name = str(entry["name"])
        if name in {"", ".", "TRAILER!!!"}:
            continue
        relative = pathlib.PurePosixPath(name)
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError(f"chemin CPIO dangereux: {name!r}")
        target = destination.joinpath(*relative.parts)
        resolved_parent = target.parent.resolve()
        if root != resolved_parent and root not in resolved_parent.parents:
            raise ValueError(f"chemin CPIO hors destination: {name!r}")
        mode = int(entry["mode"])
        file_type = stat.S_IFMT(mode)
        target.parent.mkdir(parents=True, exist_ok=True)
        if file_type == stat.S_IFDIR:
            target.mkdir(parents=True, exist_ok=True)
        elif file_type == stat.S_IFREG:
            target.write_bytes(
                raw[int(entry["data_start"]) : int(entry["data_end"])]
            )
        elif file_type == stat.S_IFLNK:
            link = raw[
                int(entry["data_start"]) : int(entry["data_end"])
            ].rstrip(b"\0").decode("utf-8", errors="surrogateescape")
            if target.exists() or target.is_symlink():
                target.unlink()
            target.symlink_to(link)
        else:
            # Les périphériques et FIFO sont volontairement omis en analyse.
            continue
        if not target.is_symlink():
            os.chmod(target, stat.S_IMODE(mode))


def find_candidates(raw: bytes) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    start = 0
    while True:
        offset = raw.find(GZIP_MAGIC, start)
        if offset < 0:
            break
        start = offset + 1
        decompressor = zlib.decompressobj(16 + zlib.MAX_WBITS)
        try:
            unpacked = decompressor.decompress(raw[offset:])
            unpacked += decompressor.flush()
        except zlib.error:
            continue
        if not decompressor.eof or not unpacked.startswith(CPIO_MAGIC):
            continue
        try:
            entries = parse_newc(unpacked)
        except ValueError:
            continue
        consumed = len(raw[offset:]) - len(decompressor.unused_data)
        results.append(
            {
                "offset": offset,
                "offset_hex": f"0x{offset:x}",
                "compressed_size": consumed,
                "compressed_end": offset + consumed,
                "compressed_end_hex": f"0x{offset + consumed:x}",
                "uncompressed_size": len(unpacked),
                "entries": len(entries),
                "contains_sqfs": any(
                    entry["name"] in {"sqfs.img", "modsqfs.img"} for entry in entries
                ),
                "_data": unpacked,
            }
        )
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path)
    parser.add_argument("--metadata", type=pathlib.Path)
    parser.add_argument("--extract-dir", type=pathlib.Path)
    args = parser.parse_args()
    raw = args.image.read_bytes()
    candidates = find_candidates(raw)
    serializable = [
        {key: value for key, value in candidate.items() if key != "_data"}
        for candidate in candidates
    ]
    if args.metadata:
        args.metadata.parent.mkdir(parents=True, exist_ok=True)
        args.metadata.write_text(
            json.dumps(serializable, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(serializable, indent=2, ensure_ascii=False))
    valid = [candidate for candidate in candidates if candidate["contains_sqfs"]]
    if args.output:
        if len(valid) != 1:
            raise ValueError(
                f"attendu un initramfs avec SquashFS, trouvé {len(valid)}"
            )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(bytes(valid[0]["_data"]))
    if args.extract_dir:
        if len(valid) != 1:
            raise ValueError(
                f"attendu un initramfs avec SquashFS, trouvé {len(valid)}"
            )
        archive = bytes(valid[0]["_data"])
        extract_regular_entries(archive, parse_newc(archive), args.extract_dir)
    return 0 if valid else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        print(f"erreur: {error}", file=sys.stderr)
        raise SystemExit(1)
