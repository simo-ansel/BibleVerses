#!/usr/bin/env python3
"""
Builds the offline Bible database bundled with the app (assets/db/bible.db)
and the TypeScript book index (src/data/books.generated.ts).

Sources (all public domain):
  * KJVA.json            King James Version (1769) with the Apocrypha
                         https://github.com/scrollmapper/bible_databases  (formats/json/KJVA.json)
  * 1-enoch.json         1 Enoch, tr. R. H. Charles (1917)
  * book-of-jubilees.json Jubilees, tr. R. H. Charles (1902/1917)
                         https://github.com/scrollmapper/bible_databases_deuterocanonical  (sources/en/...)

Usage:
  python3 scripts/build_db.py --kjva path/KJVA.json --enoch path/1-enoch.json \
      --jubilees path/book-of-jubilees.json [--report]

The script is deterministic: same inputs -> same database.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "assets" / "db" / "bible.db"
TS_PATH = ROOT / "src" / "data" / "books.generated.ts"
DAILY_PATH = ROOT / "data" / "daily-verses.txt"

# Bump when the database content changes, so installed apps replace their copy.
DB_VERSION = 1
DAILY_SEED = 1611  # fixed seed: every phone shows the same verse on the same day

SECTIONS = {
    "ot": ("Old Testament", ""),
    "apocrypha": ("Apocrypha", "Books kept in Catholic and Orthodox Bibles, printed in the King James Bible of 1611"),
    "nt": ("New Testament", ""),
    "ethiopian": ("Ethiopian canon", "Books kept in the Bible of the Ethiopian Orthodox Church"),
}

# (source name, display name, abbreviation, section, extra aliases)
BOOKS: list[tuple[str, str, str, str, list[str]]] = [
    ("Genesis", "Genesis", "Gen", "ot", ["gn", "ge"]),
    ("Exodus", "Exodus", "Exod", "ot", ["ex", "exo"]),
    ("Leviticus", "Leviticus", "Lev", "ot", ["lv", "le"]),
    ("Numbers", "Numbers", "Num", "ot", ["nm", "nb", "nu"]),
    ("Deuteronomy", "Deuteronomy", "Deut", "ot", ["dt", "de"]),
    ("Joshua", "Joshua", "Josh", "ot", ["jos", "jsh"]),
    ("Judges", "Judges", "Judg", "ot", ["jdg", "jg"]),
    ("Ruth", "Ruth", "Ruth", "ot", ["rt", "ru"]),
    ("I Samuel", "1 Samuel", "1 Sam", "ot", ["1 sa", "1 sm", "i samuel", "first samuel"]),
    ("II Samuel", "2 Samuel", "2 Sam", "ot", ["2 sa", "2 sm", "ii samuel", "second samuel"]),
    ("I Kings", "1 Kings", "1 Kgs", "ot", ["1 ki", "1 kin", "i kings", "first kings"]),
    ("II Kings", "2 Kings", "2 Kgs", "ot", ["2 ki", "2 kin", "ii kings", "second kings"]),
    ("I Chronicles", "1 Chronicles", "1 Chr", "ot", ["1 ch", "1 chron", "i chronicles"]),
    ("II Chronicles", "2 Chronicles", "2 Chr", "ot", ["2 ch", "2 chron", "ii chronicles"]),
    ("Ezra", "Ezra", "Ezra", "ot", ["ezr"]),
    ("Nehemiah", "Nehemiah", "Neh", "ot", ["ne"]),
    ("Esther", "Esther", "Esth", "ot", ["est", "es"]),
    ("Job", "Job", "Job", "ot", ["jb"]),
    ("Psalms", "Psalms", "Ps", "ot", ["psalm", "psa", "pss", "psm"]),
    ("Proverbs", "Proverbs", "Prov", "ot", ["prv", "pro", "prov"]),
    ("Ecclesiastes", "Ecclesiastes", "Eccl", "ot", ["ecc", "eccles", "qoheleth"]),
    ("Song of Solomon", "Song of Solomon", "Song", "ot", ["song of songs", "sos", "canticles", "cant", "ss"]),
    ("Isaiah", "Isaiah", "Isa", "ot", ["is"]),
    ("Jeremiah", "Jeremiah", "Jer", "ot", ["jr", "je"]),
    ("Lamentations", "Lamentations", "Lam", "ot", ["la"]),
    ("Ezekiel", "Ezekiel", "Ezek", "ot", ["ezk", "eze"]),
    ("Daniel", "Daniel", "Dan", "ot", ["dn", "da"]),
    ("Hosea", "Hosea", "Hos", "ot", ["ho"]),
    ("Joel", "Joel", "Joel", "ot", ["jl"]),
    ("Amos", "Amos", "Amos", "ot", ["am"]),
    ("Obadiah", "Obadiah", "Obad", "ot", ["ob"]),
    ("Jonah", "Jonah", "Jonah", "ot", ["jon", "jnh"]),
    ("Micah", "Micah", "Mic", "ot", ["mi"]),
    ("Nahum", "Nahum", "Nah", "ot", ["na"]),
    ("Habakkuk", "Habakkuk", "Hab", "ot", ["hb"]),
    ("Zephaniah", "Zephaniah", "Zeph", "ot", ["zep", "zp"]),
    ("Haggai", "Haggai", "Hag", "ot", ["hg"]),
    ("Zechariah", "Zechariah", "Zech", "ot", ["zec", "zc"]),
    ("Malachi", "Malachi", "Mal", "ot", ["ml"]),
    # Apocrypha, in the order of the King James Bible of 1611
    ("I Esdras", "1 Esdras", "1 Esd", "apocrypha", ["1 esdr", "i esdras", "3 ezra"]),
    ("II Esdras", "2 Esdras", "2 Esd", "apocrypha", ["2 esdr", "ii esdras", "4 ezra"]),
    ("Tobit", "Tobit", "Tob", "apocrypha", ["tb", "tobias"]),
    ("Judith", "Judith", "Jdt", "apocrypha", ["jth"]),
    ("Additions to Esther", "Additions to Esther", "Add Esth", "apocrypha", ["rest of esther", "greek esther", "addesth", "esther greek"]),
    ("Wisdom", "Wisdom of Solomon", "Wis", "apocrypha", ["wisdom", "ws", "wisd"]),
    ("Sirach", "Sirach", "Sir", "apocrypha", ["ecclesiasticus", "ecclus", "ben sira", "ben sirach"]),
    ("Baruch", "Baruch", "Bar", "apocrypha", ["letter of jeremiah", "epistle of jeremy"]),
    ("Prayer of Azariah", "Prayer of Azariah", "Pr Azar", "apocrypha", ["azar", "song of the three", "song of the three children", "song of the three holy children"]),
    ("Susanna", "Susanna", "Sus", "apocrypha", []),
    ("Bel and the Dragon", "Bel and the Dragon", "Bel", "apocrypha", ["bel and dragon"]),
    ("Prayer of Manasses", "Prayer of Manasseh", "Pr Man", "apocrypha", ["manasseh", "manasses", "prayer of manasses", "prman"]),
    ("I Maccabees", "1 Maccabees", "1 Macc", "apocrypha", ["1 mac", "1 mc", "1 ma", "i maccabees"]),
    ("II Maccabees", "2 Maccabees", "2 Macc", "apocrypha", ["2 mac", "2 mc", "2 ma", "ii maccabees"]),
    # New Testament
    ("Matthew", "Matthew", "Matt", "nt", ["mt", "mat"]),
    ("Mark", "Mark", "Mark", "nt", ["mk", "mrk", "mr"]),
    ("Luke", "Luke", "Luke", "nt", ["lk", "luk"]),
    ("John", "John", "John", "nt", ["jn", "jhn", "joh"]),
    ("Acts", "Acts", "Acts", "nt", ["ac", "act", "acts of the apostles"]),
    ("Romans", "Romans", "Rom", "nt", ["ro", "rm"]),
    ("I Corinthians", "1 Corinthians", "1 Cor", "nt", ["1 co", "i corinthians"]),
    ("II Corinthians", "2 Corinthians", "2 Cor", "nt", ["2 co", "ii corinthians"]),
    ("Galatians", "Galatians", "Gal", "nt", ["ga"]),
    ("Ephesians", "Ephesians", "Eph", "nt", ["ephes"]),
    ("Philippians", "Philippians", "Phil", "nt", ["php", "pp"]),
    ("Colossians", "Colossians", "Col", "nt", []),
    ("I Thessalonians", "1 Thessalonians", "1 Thess", "nt", ["1 thes", "1 th", "i thessalonians"]),
    ("II Thessalonians", "2 Thessalonians", "2 Thess", "nt", ["2 thes", "2 th", "ii thessalonians"]),
    ("I Timothy", "1 Timothy", "1 Tim", "nt", ["1 ti", "i timothy"]),
    ("II Timothy", "2 Timothy", "2 Tim", "nt", ["2 ti", "ii timothy"]),
    ("Titus", "Titus", "Titus", "nt", ["tit"]),
    ("Philemon", "Philemon", "Phlm", "nt", ["philem", "phm"]),
    ("Hebrews", "Hebrews", "Heb", "nt", []),
    ("James", "James", "Jas", "nt", ["jm"]),
    ("I Peter", "1 Peter", "1 Pet", "nt", ["1 pe", "1 pt", "i peter"]),
    ("II Peter", "2 Peter", "2 Pet", "nt", ["2 pe", "2 pt", "ii peter"]),
    ("I John", "1 John", "1 John", "nt", ["1 jn", "1 jhn", "i john"]),
    ("II John", "2 John", "2 John", "nt", ["2 jn", "2 jhn", "ii john"]),
    ("III John", "3 John", "3 John", "nt", ["3 jn", "3 jhn", "iii john"]),
    ("Jude", "Jude", "Jude", "nt", ["jud", "jd"]),
    ("Revelation of John", "Revelation", "Rev", "nt", ["revelations", "apocalypse", "revelation of john", "re"]),
    # Ethiopian canon
    ("I Enoch", "1 Enoch", "1 En", "ethiopian", ["enoch", "en", "ethiopic enoch"]),
    ("Jubilees", "Jubilees", "Jub", "ethiopian", ["book of jubilees", "little genesis"]),
]


# ───────────────────────── text cleaning ─────────────────────────

def squash(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.;:?!])", r"\1", text)
    return text.strip()


def clean_kjv(text: str) -> str:
    text = text.replace("–", "-")           # Beth–el -> Beth-el (KJV uses hyphens in names)
    text = re.sub(r"\[([^\]]*)\]", r"\1", text)
    return squash(text)


def clean_enoch(text: str) -> str:
    text = re.sub(r"\[Lost passage[^\]]*\]", "", text)
    text = re.sub(r"\[\d+:\d+[a-z]\]", "", text)      # inline sub-verse labels like [5:6a]
    text = re.sub(r"\*\*[A-Za-z]+\*\*", "", text)       # recension markers **E** / **Gg**
    text = text.replace("†", "").replace("⌈", "").replace("⌉", "")
    text = text.replace("\x91", "'").replace("\x92", "'")
    text = text.replace("--", "—")
    text = re.sub(r"\[([^\]]*)\]", r"\1", text)
    return squash(text)


def clean_jubilees(text: str) -> str:
    text = re.sub(r"\[[^\]]*(A\.\s?M\.?|Anno Mundi)[^\]]*\]", "", text)  # chronology notes
    text = re.sub(r"\b\d[\d\s,\-]*A\.\s?M\.?\]", "", text)  # a note whose "[" sits in the previous verse
    text = re.sub(r"\[([^\]]*)\]", r"\1", text)
    text = text.replace("[", "").replace("]", "")  # brackets left open across verses
    text = re.sub(r"<([^>]*)>", r"\1", text)
    text = text.replace("~", "").replace("`", "")
    text = text.replace("--", "—")
    return squash(text)


# ───────────────────────── loading ─────────────────────────

def load_source(path: Path, cleaner) -> dict[str, list[tuple[int, int, str]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, list[tuple[int, int, str]]] = {}
    for book in data["books"]:
        rows: list[tuple[int, int, str]] = []
        seen: set[tuple[int, int]] = set()
        for ch in book["chapters"]:
            for v in ch["verses"]:
                key = (int(ch["chapter"]), int(v["verse"]))
                text = cleaner(v["text"])
                if len(text) < 3 or text in ("…", "..."):
                    continue  # placeholders (e.g. Additions to Esther 1-10:3 do not exist in the KJV)
                if key in seen:
                    continue  # 1 Enoch: Charles prints a second (Greek) recension of a few verses; keep the main one
                seen.add(key)
                rows.append((key[0], key[1], text))
        rows.sort(key=lambda r: (r[0], r[1]))
        out[book["name"]] = rows
    return out


def norm_key(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def parse_ref(line: str, by_name: dict[str, int]) -> tuple[int, int, int, int]:
    m = re.match(r"^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$", line.strip())
    if not m:
        raise ValueError(f"bad reference: {line!r}")
    name, ch, v1, v2 = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
    if name not in by_name:
        raise ValueError(f"unknown book in daily list: {name!r}")
    return by_name[name], ch, v1, int(v2) if v2 else v1


# ───────────────────────── build ─────────────────────────

def build(args) -> None:
    kjva = load_source(Path(args.kjva), clean_kjv)
    enoch = load_source(Path(args.enoch), clean_enoch)
    jub = load_source(Path(args.jubilees), clean_jubilees)
    sources = {**kjva, **enoch, **jub}

    missing = [b[0] for b in BOOKS if b[0] not in sources]
    if missing:
        sys.exit(f"missing books in sources: {missing}")
    unused = set(sources) - {b[0] for b in BOOKS}
    if unused:
        sys.exit(f"books in sources without metadata: {sorted(unused)}")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()
    db = sqlite3.connect(DB_PATH)
    db.executescript(
        """
        PRAGMA journal_mode = DELETE;
        CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE books (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, abbr TEXT NOT NULL, section TEXT NOT NULL
        );
        CREATE TABLE verses (
          id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
          verse INTEGER NOT NULL, text TEXT NOT NULL
        );
        CREATE UNIQUE INDEX verses_ref ON verses (book_id, chapter, verse);
        CREATE VIRTUAL TABLE verses_fts USING fts5 (
          text, content = 'verses', content_rowid = 'id',
          tokenize = 'porter unicode61 remove_diacritics 2'
        );
        CREATE TABLE daily (
          position INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
          verse_start INTEGER NOT NULL, verse_end INTEGER NOT NULL
        );
        """
    )

    book_meta = []
    vid = 0
    for book_id, (src, name, abbr, section, aliases) in enumerate(BOOKS, start=1):
        rows = sources[src]
        db.execute("INSERT INTO books VALUES (?,?,?,?)", (book_id, name, abbr, section))
        chapters: dict[int, int] = {}
        for ch, v, text in rows:
            vid += 1
            db.execute("INSERT INTO verses VALUES (?,?,?,?,?)", (vid, book_id, ch, v, text))
            chapters[ch] = max(chapters.get(ch, 0), v)
        all_aliases = sorted(
            {norm_key(a) for a in [name, abbr, src, *aliases]} - {""},
            key=lambda a: (len(a), a),
        )
        book_meta.append(
            {
                "id": book_id,
                "name": name,
                "abbr": abbr,
                "section": section,
                "chapters": sorted(chapters),
                "aliases": all_aliases,
            }
        )

    db.execute("INSERT INTO verses_fts (verses_fts) VALUES ('rebuild')")

    # Verse of the day pool, in a fixed shuffled order
    by_name = {b["name"]: b["id"] for b in book_meta}
    refs = []
    problems = []
    for raw in DAILY_PATH.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        ref = parse_ref(line, by_name)
        bid, ch, v1, v2 = ref
        n = db.execute(
            "SELECT COUNT(*) FROM verses WHERE book_id=? AND chapter=? AND verse BETWEEN ? AND ?",
            (bid, ch, v1, v2),
        ).fetchone()[0]
        if n != v2 - v1 + 1:
            problems.append(f"daily verse not found in text: {line}")
        elif ref in refs:
            problems.append(f"duplicate daily verse: {line}")
        else:
            refs.append(ref)
    if problems:
        sys.exit("\n".join(problems))
    rng = random.Random(DAILY_SEED)
    rng.shuffle(refs)
    db.executemany("INSERT INTO daily VALUES (?,?,?,?,?)", [(i, *r) for i, r in enumerate(refs)])

    db.executemany(
        "INSERT INTO meta VALUES (?,?)",
        [
            ("db_version", str(DB_VERSION)),
            ("translation", "King James Version (1769) with Apocrypha; 1 Enoch and Jubilees tr. R. H. Charles"),
            ("verse_count", str(vid)),
        ],
    )
    db.commit()
    db.execute(f"PRAGMA user_version = {DB_VERSION}")
    db.execute("VACUUM")
    db.close()

    write_ts(book_meta, len(refs))
    print(f"books: {len(book_meta)}  verses: {vid}  daily pool: {len(refs)}  size: {DB_PATH.stat().st_size/1e6:.1f} MB")

    if args.report:
        report(refs, book_meta)


def write_ts(book_meta: list[dict], daily_count: int) -> None:
    lines = [
        "// Generated by scripts/build_db.py — do not edit by hand.",
        "import type { BookInfo, SectionId } from './types';",
        "",
        f"export const DB_VERSION = {DB_VERSION};",
        f"export const DB_FILE = 'bible-v{DB_VERSION}.db';",
        f"export const DAILY_POOL_SIZE = {daily_count};",
        "",
        "export const SECTIONS: { id: SectionId; title: string; note: string }[] = [",
    ]
    for sid, (title, note) in SECTIONS.items():
        lines.append(f"  {{ id: '{sid}', title: {json.dumps(title)}, note: {json.dumps(note)} }},")
    lines += ["];", "", "export const BOOKS: BookInfo[] = ["]
    for b in book_meta:
        lines.append(
            "  { id: %d, name: %s, abbr: %s, section: '%s', chapters: %s, aliases: %s },"
            % (
                b["id"],
                json.dumps(b["name"]),
                json.dumps(b["abbr"]),
                b["section"],
                json.dumps(b["chapters"], separators=(",", ":")),
                json.dumps(b["aliases"], separators=(",", ":")),
            )
        )
    lines += ["];", ""]
    TS_PATH.parent.mkdir(parents=True, exist_ok=True)
    TS_PATH.write_text("\n".join(lines), encoding="utf-8")


def report(refs, book_meta) -> None:
    db = sqlite3.connect(DB_PATH)
    names = {b["id"]: b["name"] for b in book_meta}
    lengths = []
    for bid, ch, v1, v2 in refs:
        text = " ".join(
            t for (t,) in db.execute(
                "SELECT text FROM verses WHERE book_id=? AND chapter=? AND verse BETWEEN ? AND ? ORDER BY verse",
                (bid, ch, v1, v2),
            )
        )
        lengths.append(len(text))
        ref = f"{names[bid]} {ch}:{v1}" + (f"-{v2}" if v2 != v1 else "")
        print(f"{len(text):4d}  {ref:28s}  {text}")
    lengths.sort()
    print(f"\nlength median {lengths[len(lengths)//2]}  max {lengths[-1]}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--kjva", required=True)
    p.add_argument("--enoch", required=True)
    p.add_argument("--jubilees", required=True)
    p.add_argument("--report", action="store_true", help="print every verse-of-the-day text")
    build(p.parse_args())
