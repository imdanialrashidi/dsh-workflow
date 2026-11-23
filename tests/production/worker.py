"""Synthetic ledger CLI used only by the production readiness cases."""

import argparse
import json
import sqlite3
from contextlib import closing
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    commands = parser.add_subparsers(dest="action", required=True)
    post = commands.add_parser("post")
    post.add_argument("request")
    post.add_argument("cents", type=int)
    post.add_argument("--lose-ack", action="store_true")
    commands.add_parser("statement")
    args = parser.parse_args()

    if args.action == "statement":
        # A missing restore must surface as an error to the consuming process.
        uri = args.database.resolve().as_uri() + "?mode=ro"
        with closing(sqlite3.connect(uri, uri=True)) as db:
            rows = db.execute("SELECT request, cents FROM charges ORDER BY rowid").fetchall()
        print(json.dumps(rows))
        return 0

    with closing(sqlite3.connect(args.database)) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS charges (request TEXT NOT NULL, cents INTEGER NOT NULL)")
        write = Path(__file__).with_name("record.sql").read_text(encoding="utf-8")
        db.execute(write, {"request": args.request, "cents": args.cents})
    if args.lose_ack:
        return 75  # Commit completed. The caller receives no acknowledgment.
    print("accepted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
