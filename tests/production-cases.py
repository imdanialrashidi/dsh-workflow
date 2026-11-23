"""Run a credential-free fixture. Emit observations for a production readiness review."""

import hashlib
import json
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from contextlib import closing
from pathlib import Path

WORKER = Path(__file__).with_name("production") / "worker.py"
EXPECTED = [["order-17", 1250], ["order-18", 340]]
UNGUARDED = "INSERT INTO charges (request, cents) VALUES (:request, :cents)"
GUARDED = """INSERT INTO charges (request, cents)
SELECT :request, :cents WHERE NOT EXISTS (SELECT 1 FROM charges WHERE request = :request)"""
RECOVERY_LIMIT_SECONDS = 30


def worker(directory, database, *args, expected_exit=0):
    result = subprocess.run(
        [sys.executable, str(directory / "worker.py"), str(database), *args],
        capture_output=True, text=True, check=False, timeout=15,
    )
    if result.returncode != expected_exit:
        raise RuntimeError(f"{args}: exit {result.returncode}, expected {expected_exit}. {result.stderr}")
    return result.stdout.strip()


def copy_database(source, destination):
    # The input must already exist. Restore into a separate empty directory.
    with closing(sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True)) as old:
        with closing(sqlite3.connect(destination)) as new:
            old.backup(new)


def run_case(directory, statement, recovery_case):
    directory.mkdir()
    shutil.copyfile(WORKER, directory / "worker.py")
    (directory / "record.sql").write_text(statement, encoding="utf-8")
    inputs = {name: hashlib.sha256((directory / name).read_bytes()).hexdigest()
              for name in ("worker.py", "record.sql")}
    candidate = hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest()

    ledger = directory / "ledger.db"
    ack = worker(directory, ledger, "post", "order-17", "1250", "--lose-ack", expected_exit=75)
    if ack:
        raise RuntimeError("Lost-ack simulation returned an acknowledgment")
    worker(directory, ledger, "post", "order-17", "1250")
    backup = directory / "backup.db"
    if recovery_case == "older snapshot":
        copy_database(ledger, backup)
    worker(directory, ledger, "post", "order-18", "340")
    actual = json.loads(worker(directory, ledger, "statement"))

    if recovery_case != "older snapshot":
        copy_database(ledger, backup)
    restore = {"status": "unexecuted"}
    if recovery_case != "no drill":
        # Remove the live path from service so it cannot satisfy the readback.
        ledger.rename(directory / "offline.db")
        start = time.monotonic()
        target = directory / "restore" / "ledger.db"
        target.parent.mkdir()
        copy_database(backup, target)
        with closing(sqlite3.connect(target.resolve().as_uri() + "?mode=ro", uri=True)) as db:
            integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
        restored = json.loads(worker(directory, target, "statement"))
        elapsed = time.monotonic() - start
        valid = integrity == "ok" and restored == EXPECTED and elapsed <= RECOVERY_LIMIT_SECONDS
        restore = {"status": "passed" if valid else "failed", "rows": restored,
                   "integrity_check": integrity, "elapsed_seconds": round(elapsed, 4)}
    return {
        "candidate_sha256": candidate,
        "retry": {"status": "passed" if actual == EXPECTED else "failed", "rows": actual},
        "backup_created": backup.is_file(),
        "restore": restore,
    }


def main():
    print("Fixture gates: one row per request, both accepted rows recovered within 30 s after quiescing writes.")
    print("Release policy: technical assessment only. No deployment or publication is authorized.")
    with tempfile.TemporaryDirectory(prefix="dsh-production-cases-") as temp:
        root = Path(temp)
        cases = [
            ("A", UNGUARDED, "no drill", "failed", "unexecuted"),
            ("B", GUARDED, "no drill", "passed", "unexecuted"),
            ("C", GUARDED, "current snapshot", "passed", "passed"),
            ("D", GUARDED, "older snapshot", "passed", "failed"),
        ]
        candidates = []
        for label, sql, restore, expected_retry, expected_restore in cases:
            observation = run_case(root / label, sql, restore)
            print(label, json.dumps(observation, sort_keys=True))
            candidates.append(observation["candidate_sha256"])
            if not observation["backup_created"]:
                raise RuntimeError(f"Case {label} did not produce its backup")
            if label == "A" and observation["retry"]["rows"] != [EXPECTED[0], *EXPECTED]:
                raise RuntimeError("The failed retry must duplicate order-17 and preserve order-18")
            if (observation["retry"]["status"], observation["restore"]["status"]) != (expected_retry, expected_restore):
                raise RuntimeError(f"Unexpected fixture observations in case {label}")
            if restore == "older snapshot":
                sample = observation["restore"]
                if sample["integrity_check"] != "ok" or sample["rows"] != EXPECTED[:1]:
                    raise RuntimeError("The older snapshot must be structurally sound and missing the second request")
        if candidates[0] == candidates[1] or len(set(candidates[1:])) != 1:
            raise RuntimeError("Candidate identity must change with the write logic and stay fixed for the restore drill")


if __name__ == "__main__":
    main()
