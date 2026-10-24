"""Dump text content of docx / xlsx files passed as arguments (stdlib only)."""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
NS_S = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def cell_value(c, shared):
    ref = c.get("r", "?")
    t = c.get("t")
    if t == "s":
        v = c.find(f"{NS_S}v")
        text = shared[int(v.text)] if v is not None and v.text else ""
    elif t == "inlineStr":
        text = "".join(x.text or "" for x in c.iter(f"{NS_S}t"))
    else:
        v = c.find(f"{NS_S}v")
        text = v.text if v is not None else ""
    return ref, text


def dump_xlsx(path):
    with zipfile.ZipFile(path) as zf:
        names = zf.namelist()
        shared = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{NS_S}si"):
                shared.append("".join(t.text or "" for t in si.iter(f"{NS_S}t")))
        # Map sheet file -> name from workbook.xml (order of sheets)
        wb = ET.fromstring(zf.read("xl/workbook.xml"))
        sheet_names = [s.get("name") for s in wb.iter(f"{NS_S}sheet")]
        sheet_files = [n for n in names if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n)]
        sheet_files.sort(key=lambda n: int(re.search(r"(\d+)", n).group(1)))
        for i, sf in enumerate(sheet_files):
            title = sheet_names[i] if i < len(sheet_names) else sf
            print(f"\n===== SHEET: {title} =====")
            root = ET.fromstring(zf.read(sf))
            for row in root.iter(f"{NS_S}row"):
                cells = []
                for c in row.findall(f"{NS_S}c"):
                    ref, text = cell_value(c, shared)
                    if text != "":
                        cells.append(f"{ref}={text}")
                if cells:
                    print(" | ".join(cells))


def dump_docx(path):
    with zipfile.ZipFile(path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    for p in root.iter(f"{NS_W}p"):
        text = "".join(t.text or "" for t in p.iter(f"{NS_W}t"))
        if text.strip():
            print(text)


for arg in sys.argv[1:]:
    print(f"\n########## {arg} ##########")
    if arg.endswith(".docx"):
        dump_docx(arg)
    elif arg.endswith(".xlsx"):
        dump_xlsx(arg)
