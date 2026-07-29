#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Inspection, extraction et reconstruction des images Realtek/SODOLA .bix.

Le format observé est l'ancien en-tête U-Boot de 64 octets, suivi d'un
flux LZMA-Alone. Tous les entiers de l'en-tête sont big-endian.

Ce programme n'écrit jamais sur le fichier source. La commande ``repack``
crée un nouveau fichier et recalcule les CRC U-Boot.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import lzma
import pathlib
import struct
import sys
import zlib


HEADER = struct.Struct(">7I4B32s")
HEADER_SIZE = HEADER.size


def parse_header(raw: bytes) -> dict[str, object]:
    if len(raw) < HEADER_SIZE:
        raise ValueError("fichier trop court pour contenir un en-tête BIX")
    values = HEADER.unpack(raw[:HEADER_SIZE])
    keys = (
        "magic",
        "header_crc",
        "timestamp",
        "data_size",
        "load_address",
        "entry_point",
        "data_crc",
        "os",
        "architecture",
        "image_type",
        "compression",
        "name_raw",
    )
    header = dict(zip(keys, values))
    header["name"] = bytes(header["name_raw"]).split(b"\0", 1)[0].decode(
        "ascii", errors="replace"
    )
    return header


def header_bytes(header: dict[str, object], *, header_crc: int | None = None) -> bytes:
    name = str(header["name"]).encode("ascii")
    if len(name) > 32:
        raise ValueError("le nom/version dépasse 32 octets")
    return HEADER.pack(
        int(header["magic"]),
        int(header["header_crc"] if header_crc is None else header_crc),
        int(header["timestamp"]),
        int(header["data_size"]),
        int(header["load_address"]),
        int(header["entry_point"]),
        int(header["data_crc"]),
        int(header["os"]),
        int(header["architecture"]),
        int(header["image_type"]),
        int(header["compression"]),
        name.ljust(32, b"\0"),
    )


def inspect(path: pathlib.Path, *, decompress: bool = False) -> dict[str, object]:
    raw = path.read_bytes()
    header = parse_header(raw)
    payload_end = HEADER_SIZE + int(header["data_size"])
    payload = raw[HEADER_SIZE:payload_end]
    trailing = raw[payload_end:] if payload_end <= len(raw) else b""
    zeroed = bytearray(raw[:HEADER_SIZE])
    zeroed[4:8] = b"\0\0\0\0"
    calc_hcrc = zlib.crc32(zeroed) & 0xFFFFFFFF
    calc_dcrc = zlib.crc32(payload) & 0xFFFFFFFF
    result: dict[str, object] = {
        "path": str(path),
        "file_size": len(raw),
        "header_size": HEADER_SIZE,
        "magic": f"0x{int(header['magic']):08x}",
        "header_crc": f"0x{int(header['header_crc']):08x}",
        "header_crc_calculated": f"0x{calc_hcrc:08x}",
        "header_crc_valid": int(header["header_crc"]) == calc_hcrc,
        "timestamp": int(header["timestamp"]),
        "timestamp_utc": dt.datetime.fromtimestamp(
            int(header["timestamp"]), tz=dt.timezone.utc
        ).isoformat(),
        "data_size": int(header["data_size"]),
        "actual_data_size": len(payload),
        "data_size_valid": payload_end <= len(raw),
        "trailing_size": len(trailing),
        "has_trailing_data": bool(trailing),
        "load_address": f"0x{int(header['load_address']):08x}",
        "entry_point": f"0x{int(header['entry_point']):08x}",
        "data_crc": f"0x{int(header['data_crc']):08x}",
        "data_crc_calculated": f"0x{calc_dcrc:08x}",
        "data_crc_valid": int(header["data_crc"]) == calc_dcrc,
        "os": int(header["os"]),
        "architecture": int(header["architecture"]),
        "image_type": int(header["image_type"]),
        "compression": int(header["compression"]),
        "name": str(header["name"]),
    }
    if decompress:
        unpacked = lzma.decompress(payload, format=lzma.FORMAT_ALONE)
        result["uncompressed_size"] = len(unpacked)
        result["uncompressed_crc32"] = f"0x{zlib.crc32(unpacked) & 0xFFFFFFFF:08x}"
    return result


def unpack(source: pathlib.Path, destination: pathlib.Path) -> None:
    raw = source.read_bytes()
    header = parse_header(raw)
    payload_end = HEADER_SIZE + int(header["data_size"])
    if payload_end > len(raw):
        raise ValueError("la taille déclarée dépasse la taille du fichier")
    payload = raw[HEADER_SIZE:payload_end]
    trailing = raw[payload_end:]
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "header.bin").write_bytes(raw[:HEADER_SIZE])
    (destination / "payload.lzma").write_bytes(payload)
    if trailing:
        (destination / "trailing-data.bin").write_bytes(trailing)
    (destination / "image-uncompressed.bin").write_bytes(
        lzma.decompress(payload, format=lzma.FORMAT_ALONE)
    )
    (destination / "metadata.json").write_text(
        json.dumps(inspect(source, decompress=True), indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )


def repack(
    template: pathlib.Path,
    uncompressed: pathlib.Path,
    destination: pathlib.Path,
    *,
    name: str | None,
    timestamp: int | None,
    dictionary_size: int,
) -> None:
    source_paths = {template.resolve(), uncompressed.resolve()}
    if destination.resolve() in source_paths:
        raise ValueError("la destination ne peut pas remplacer un fichier source")
    if destination.exists():
        raise FileExistsError(f"la destination existe déjà: {destination}")
    template_raw = template.read_bytes()
    header = parse_header(template_raw)
    image = uncompressed.read_bytes()
    filters = [
        {
            "id": lzma.FILTER_LZMA1,
            "dict_size": dictionary_size,
            "lc": 3,
            "lp": 0,
            "pb": 2,
            "mode": lzma.MODE_NORMAL,
            "nice_len": 64,
            "mf": lzma.MF_BT4,
        }
    ]
    payload = lzma.compress(image, format=lzma.FORMAT_ALONE, filters=filters)
    header["name"] = name if name is not None else header["name"]
    header["timestamp"] = (
        timestamp
        if timestamp is not None
        else int(dt.datetime.now(tz=dt.timezone.utc).timestamp())
    )
    header["data_size"] = len(payload)
    header["data_crc"] = zlib.crc32(payload) & 0xFFFFFFFF
    header["header_crc"] = 0
    first = header_bytes(header, header_crc=0)
    header["header_crc"] = zlib.crc32(first) & 0xFFFFFFFF
    final_header = header_bytes(header)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(final_header + payload)
    result = inspect(destination, decompress=True)
    if not (
        result["header_crc_valid"]
        and result["data_crc_valid"]
        and result["data_size_valid"]
    ):
        destination.unlink(missing_ok=True)
        raise RuntimeError("l'image reconstruite n'a pas passé son autocontrôle")


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    inspect_parser = sub.add_parser("inspect")
    inspect_parser.add_argument("image", type=pathlib.Path)
    inspect_parser.add_argument("--decompress", action="store_true")

    unpack_parser = sub.add_parser("unpack")
    unpack_parser.add_argument("image", type=pathlib.Path)
    unpack_parser.add_argument("destination", type=pathlib.Path)

    repack_parser = sub.add_parser("repack")
    repack_parser.add_argument("--template", required=True, type=pathlib.Path)
    repack_parser.add_argument("--uncompressed", required=True, type=pathlib.Path)
    repack_parser.add_argument("--output", required=True, type=pathlib.Path)
    repack_parser.add_argument("--name")
    repack_parser.add_argument("--timestamp", type=int)
    repack_parser.add_argument(
        "--dictionary-size",
        type=lambda value: int(value, 0),
        default=0x02000000,
    )

    args = parser.parse_args()
    if args.command == "inspect":
        print(
            json.dumps(
                inspect(args.image, decompress=args.decompress),
                indent=2,
                ensure_ascii=False,
            )
        )
    elif args.command == "unpack":
        unpack(args.image, args.destination)
    elif args.command == "repack":
        repack(
            args.template,
            args.uncompressed,
            args.output,
            name=args.name,
            timestamp=args.timestamp,
            dictionary_size=args.dictionary_size,
        )
        print(json.dumps(inspect(args.output, decompress=True), indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, lzma.LZMAError, RuntimeError) as error:
        print(f"erreur: {error}", file=sys.stderr)
        raise SystemExit(1)
