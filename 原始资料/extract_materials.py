"""Extract the GBK-named competition zip into an empty directory with proper names."""
import sys
import zipfile

src, dest = sys.argv[1], sys.argv[2]

with zipfile.ZipFile(src) as zf:
    for info in zf.infolist():
        name = info.filename
        # Skip macOS resource forks
        if "__MACOSX" in name or "/._" in name:
            continue
        # Zip stored UTF-8 bytes; zipfile decodes them as cp437 when the
        # unicode flag is unset. Re-encode to cp437 then decode as UTF-8.
        if not (info.flag_bits & 0x800):
            try:
                name = info.filename.encode("cp437").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                name = info.filename
        target = f"{dest}/{name}"
        if info.is_dir():
            continue
        import os
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with zf.open(info) as fsrc, open(target, "wb") as fdst:
            fdst.write(fsrc.read())
        print(target)
