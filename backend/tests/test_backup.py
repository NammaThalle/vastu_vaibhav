import gzip
import sqlite3

from app.cli import backup as backup_cli


def test_backup_writes_readable_snapshot_and_prunes(tmp_path, monkeypatch):
    db = tmp_path / "live.db"
    with sqlite3.connect(db) as conn:
        conn.execute("CREATE TABLE t (x)")
        conn.execute("INSERT INTO t VALUES (42)")
    monkeypatch.setattr(backup_cli.settings, "DATABASE_URL", f"sqlite+aiosqlite:///{db}")

    dest = tmp_path / "backups"
    for i in range(3):
        (dest / f"vastu_2000-01-0{i + 1}_00-00-00.db.gz").parent.mkdir(exist_ok=True)
        (dest / f"vastu_2000-01-0{i + 1}_00-00-00.db.gz").write_bytes(b"")
    target = backup_cli.backup(dest, keep=2)

    restored = tmp_path / "restored.db"
    restored.write_bytes(gzip.decompress(target.read_bytes()))
    with sqlite3.connect(restored) as conn:
        assert conn.execute("SELECT x FROM t").fetchone() == (42,)
    assert len(list(dest.glob("vastu_*.db.gz"))) == 2
