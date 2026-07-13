"""One-time import of the pre-redesign database into the new schema.

The target database must already be migrated (alembic upgrade head), seeded, and
contain no clients. Every row is written through the models. Before anything is
committed, each legacy client's billed, paid and balance totals are compared with the
new data, and the import aborts on any difference. Delete this module once the live
data has been moved.

Usage:
    python -m app.cli.import_legacy --legacy data/legacy/old.db [--url sqlite:///new.db] [--dry-run]
        [--skip-user test@example.com ...]
"""
import argparse
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import sync_session
from app.models import CatalogItem, Charge, Client, Payment, Property, User, Visit
from app.models.enums import ChargeKind, ItemKind, PaymentMethod, VisitStatus
from app.services.numbering import fiscal_year

IST = timezone(timedelta(hours=5, minutes=30))

INITIAL_FEE_DESCRIPTION = "Initial consultation fee"

PAYMENT_METHODS = {
    "cash": PaymentMethod.CASH,
    "upi / gpay": PaymentMethod.UPI,
    "upi": PaymentMethod.UPI,
    "bank transfer": PaymentMethod.BANK_TRANSFER,
    "cheque": PaymentMethod.CHEQUE,
}

# Spelling variants seen in old free-text charges, mapped to catalog names (normalized form).
ALIASES = {
    "devta enhancer": "devata enhancer",
    "positivy enhancer": "positivity enhancer",
    "stair blocker": "staircase blocker",
    "virtual door open": "virtual door opener",
    "virtual opener for main gate": "virtual main gate opener",
    "aparment vastu": "apartment vastu",
}

# Old remedy names that are now one catalog item. Each maps to the catalog name, the note
# written on the bill line (where the remedy goes), and how many units one old unit holds.
@dataclass(frozen=True)
class Rename:
    target: str
    note: str | None = None
    units: int = 1


RENAMES = {
    "devta": Rename("devata enhancer", units=4),  # "4 Devtas" is four Devata Enhancers
    "brahmasthan": Rename("brahmasthan enhancer"),
    "enhancer": Rename("positivity enhancer"),
    "golden line": Rename("golden line enhancer"),
    "entrance blocker": Rename("door blocker", "Entrance"),
    "virtual door blocker": Rename("door blocker", "Virtual door"),
    "main door blocker": Rename("door blocker", "Main door"),
    "main door close": Rename("door blocker", "Main door"),
    "shutter door blocker": Rename("door blocker", "Shutter"),
    "main gate blocker": Rename("door blocker", "Main gate"),
    "door opener": Rename("virtual door opener"),
    "entrance door opener": Rename("virtual door opener", "Entrance"),
    "virtual door entry": Rename("virtual door opener"),
    "virtual entrance opener": Rename("virtual door opener", "Entrance"),
    "virtual main gate opener": Rename("virtual door opener", "Main gate"),
}

@dataclass
class Report:
    counts: Counter = field(default_factory=Counter)
    unlinked: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    mismatches: list[str] = field(default_factory=list)


# Parsing helpers

def to_date(value: str | None) -> date | None:
    """Legacy dates are naive. Midnight values are calendar dates typed by the user;
    other values are UTC server timestamps and are converted to the IST day."""
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace(" ", "T")[:19])
    if parsed.time() == datetime.min.time():
        return parsed.date()
    return parsed.replace(tzinfo=timezone.utc).astimezone(IST).date()


def to_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace(" ", "T")[:19]).replace(tzinfo=timezone.utc)


def rupees(value) -> int:
    """Legacy amounts are NUMERIC; the new schema keeps whole rupees only."""
    number = float(value or 0)
    if number != int(number):
        raise SystemExit(f"Amount {value} has paise; the new schema stores whole rupees only.")
    return int(number)


def normalize(text: str) -> str:
    text = text.lower().replace("+ve", " positive ")
    text = re.sub(r"\d+\s*ml\b", " ", text)
    text = re.sub(r"\bx\s*\d+\b", " ", text)
    text = re.sub(r"\b(remedy|remedies|service|floors?|flats?)\b", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\b\d+\b", " ", text)
    words = [w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w for w in text.split()]
    key = " ".join(words)
    return ALIASES.get(key, key)


@dataclass
class ParsedLine:
    item: CatalogItem | None
    quantity: int
    unit_price: int
    size_assumed: bool = False
    note: str | None = None

    @property
    def description(self) -> str | None:
        """The description the app itself would write for this catalog item."""
        if self.item is None:
            return None
        return f"{self.item.name} ({self.item.size_ml}ml)" if self.item.size_ml else self.item.name


class CatalogIndex:
    def __init__(self, items: list[CatalogItem]):
        self.by_key: dict[str, list[CatalogItem]] = defaultdict(list)
        for item in items:
            self.by_key[normalize(item.name)].append(item)

    def match(self, description: str) -> tuple[CatalogItem | None, bool, Rename]:
        key = normalize(description)
        rename = RENAMES.get(key, Rename(key))
        candidates = self.by_key.get(rename.target, [])
        if not candidates:
            return None, False, rename
        size = re.search(r"(\d+)\s*ml\b", description, re.I)
        if size:
            sized = [c for c in candidates if c.size_ml == int(size.group(1))]
            return (sized[0] if sized else None), False, rename
        if len(candidates) == 1:
            only = candidates[0]
            return only, only.kind == ItemKind.REMEDY and only.size_ml is not None, rename
        # No size on the old bill: every early remedy was the standard 5ml bottle.
        standard = [c for c in candidates if c.size_ml == 5]
        return (standard[0], True, rename) if standard else (None, False, rename)


def parse_line(description: str, amount: int, catalog: CatalogIndex) -> ParsedLine:
    quantity = 1
    found = re.findall(r"\bx\s*(\d+)\b", description, re.I)
    if found:
        candidate = int(found[-1])
        if candidate > 0 and amount % candidate == 0:
            quantity = candidate
    item, size_assumed, rename = catalog.match(description)
    unit_price = amount // quantity
    if item is not None and rename.units > 1 and unit_price % rename.units == 0:
        quantity, unit_price = quantity * rename.units, unit_price // rename.units
    return ParsedLine(item, quantity, unit_price, size_assumed, rename.note if item else None)


# Import

def legacy_rows(conn: sqlite3.Connection, sql: str) -> list[sqlite3.Row]:
    return conn.execute(sql).fetchall()


def check_target(session: Session) -> None:
    if session.scalar(select(func.count(Client.id))):
        sys.exit("Target database already has clients; refusing to import twice.")
    if not session.scalar(select(func.count(CatalogItem.id))):
        sys.exit("Target catalog is empty; run `python -m app.cli.seed` first.")


def import_all(conn: sqlite3.Connection, session: Session, report: Report,
               skip_users: frozenset[str] = frozenset()) -> dict[str, str]:
    """Returns legacy client id -> new property id. Accounts listed in skip_users are left out."""
    catalog = CatalogIndex(list(session.scalars(select(CatalogItem))))
    skip = {email.strip().lower() for email in skip_users}

    for row in legacy_rows(conn, "SELECT * FROM users"):
        if row["email"].strip().lower() in skip:
            report.counts["users skipped"] += 1
            continue
        session.add(User(id=row["id"], email=row["email"], hashed_password=row["hashed_password"],
                         is_active=bool(row["is_active"]), is_admin=bool(row["is_admin"]),
                         created_at=to_datetime(row["created_at"])))
        report.counts["users"] += 1

    visits_by_client: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for row in legacy_rows(conn, "SELECT * FROM visits"):
        visits_by_client[row["client_id"]].append(row)

    property_of: dict[str, str] = {}
    for row in legacy_rows(conn, "SELECT * FROM clients ORDER BY created_at"):
        client_notes = [
            f"{label}: {row[col]}"
            for col, label in (("email", "Email"), ("personal_address", "Personal address"),
                               ("built_up_area", "Built-up area"))
            if row[col] not in (None, "")
        ]
        client = Client(id=row["id"], name=row["full_name"].strip(), phone=row["phone"] or None,
                        notes="\n".join(client_notes) or None, created_at=to_datetime(row["created_at"]))
        session.add(client)

        address = (row["project_address"] or "").strip() or None
        location = row["location_type"]
        prop = Property(
            client_id=client.id,
            label=address.split(",")[0].strip()[:200] if address else row["full_name"].strip(),
            address=address,
            notes=f"Location: {location}" if location and location != "Goa" else None,
            closed_at=to_datetime(row["updated_at"]) if row["lead_status"] == "Inactive" else None,
            created_at=to_datetime(row["created_at"]),
        )
        session.add(prop)
        session.flush()
        property_of[row["id"]] = prop.id
        report.counts["clients"] += 1
        if row["service_id"]:
            report.counts["dropped package links"] += 1

        fee = rupees(row["total_fees_fixed"])
        if fee > 0:
            session.add(Charge(property_id=prop.id, description=INITIAL_FEE_DESCRIPTION, quantity=1,
                               unit_price=fee, charge_date=to_date(row["created_at"]),
                               created_at=to_datetime(row["created_at"])))
            report.counts["initial fees"] += 1

    today = datetime.now(IST).date()
    for row in legacy_rows(conn, "SELECT * FROM visits"):
        visit_day = to_date(row["date"]) or to_date(row["created_at"])
        session.add(Visit(id=row["id"], property_id=property_of[row["client_id"]], visit_date=visit_day,
                          status=VisitStatus.SCHEDULED if visit_day > today else VisitStatus.DONE,
                          purpose=(row["purpose"] or "").strip() or None, observations=row["observations"],
                          created_at=to_datetime(row["created_at"])))
        report.counts["visits"] += 1
        linked = conn.execute("SELECT COUNT(*) FROM service_entries WHERE visit_id = ? AND amount = ?",
                              (row["id"], row["amount"])).fetchone()[0]
        if row["amount"] and rupees(row["amount"]) > 0 and not linked:
            report.mismatches.append(f"visit {row['id']} has an amount without a ledger line")
    session.flush()

    for row in legacy_rows(conn, "SELECT * FROM service_entries"):
        amount = rupees(row["amount"])
        description = (row["description"] or "").strip()
        kind = ChargeKind.DISCOUNT if row["entry_type"] == "discount" else ChargeKind.CHARGE
        if kind == ChargeKind.DISCOUNT or row["visit_id"]:
            parsed = ParsedLine(None, 1, amount)
        else:
            parsed = parse_line(description, amount, catalog)
            if parsed.item is None:
                report.unlinked.append(f"{description} ({amount})")
            if parsed.size_assumed:
                report.counts["remedy size assumed from catalog"] += 1
        session.add(Charge(id=row["id"], property_id=property_of[row["client_id"]], visit_id=row["visit_id"],
                           catalog_item_id=parsed.item.id if parsed.item else None, kind=kind,
                           description=parsed.description or description, note=parsed.note,
                           quantity=parsed.quantity, unit_price=parsed.unit_price,
                           charge_date=to_date(row["date"]) or to_date(row["created_at"]),
                           created_at=to_datetime(row["created_at"])))
        report.counts[f"{kind.value} lines"] += 1
        report.counts["lines linked to catalog"] += parsed.item is not None

    payments = legacy_rows(conn, "SELECT * FROM payments")
    payments.sort(key=lambda r: (to_date(r["date"]) or to_date(r["created_at"]), r["created_at"] or "", r["id"]))
    next_seq: Counter = Counter()
    for row in payments:
        method = PAYMENT_METHODS.get((row["method"] or "").strip().lower())
        if method is None:
            report.mismatches.append(f"payment {row['id']} has unknown method {row['method']!r}")
            continue
        paid_on = to_date(row["date"]) or to_date(row["created_at"])
        fy = fiscal_year(paid_on)
        next_seq[fy] += 1
        session.add(Payment(id=row["id"], property_id=property_of[row["client_id"]], amount=rupees(row["amount"]),
                            method=method, paid_on=paid_on, reference=(row["notes"] or "").strip() or None,
                            fiscal_year=fy, receipt_seq=next_seq[fy], created_at=to_datetime(row["created_at"])))
        report.counts["payments"] += 1
    session.flush()
    return property_of


def verify(conn: sqlite3.Connection, session: Session, property_of: dict[str, str], report: Report) -> None:
    for row in legacy_rows(conn, "SELECT id, full_name, total_fees_fixed FROM clients"):
        old_billed = rupees(row["total_fees_fixed"])
        for entry in conn.execute("SELECT amount, entry_type FROM service_entries WHERE client_id = ?", (row["id"],)):
            old_billed += -rupees(entry["amount"]) if entry["entry_type"] == "discount" else rupees(entry["amount"])
        old_paid = sum(rupees(p["amount"]) for p in conn.execute(
            "SELECT amount FROM payments WHERE client_id = ?", (row["id"],)))

        prop_id = property_of[row["id"]]
        new_billed = sum(c.signed_amount for c in session.scalars(select(Charge).where(Charge.property_id == prop_id)))
        new_paid = sum(p.amount for p in session.scalars(select(Payment).where(Payment.property_id == prop_id)))

        if (old_billed, old_paid) != (new_billed, new_paid):
            report.mismatches.append(
                f"{row['full_name']}: billed {old_billed} -> {new_billed}, paid {old_paid} -> {new_paid}")
        report.counts["total billed"] += new_billed
        report.counts["total paid"] += new_paid


def print_report(report: Report) -> None:
    print("Import summary")
    for key, value in report.counts.items():
        print(f"  {key}: {value}")
    if report.unlinked:
        print(f"  charges kept as free text ({len(report.unlinked)}):")
        for line in sorted(report.unlinked):
            print(f"    {line}")
    if report.mismatches:
        print(f"  MISMATCHES ({len(report.mismatches)}):")
        for line in report.mismatches:
            print(f"    {line}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--legacy", required=True, type=Path, help="path to the old SQLite database")
    parser.add_argument("--url", help="target database URL (defaults to DATABASE_URL)")
    parser.add_argument("--dry-run", action="store_true", help="verify everything, then roll back")
    parser.add_argument("--skip-user", action="append", default=[], metavar="EMAIL",
                        help="leave this sign-in account out (repeat for several)")
    args = parser.parse_args()

    conn = sqlite3.connect(f"file:{args.legacy}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    report = Report()
    with sync_session(args.url) as session:
        check_target(session)
        property_of = import_all(conn, session, report, frozenset(args.skip_user))
        verify(conn, session, property_of, report)
        print_report(report)
        if report.mismatches:
            session.rollback()
            sys.exit("Import aborted: totals do not match. Nothing was written.")
        if args.dry_run:
            session.rollback()
            print("Dry run: all totals match. Nothing was written.")
        else:
            session.commit()
            print("Import committed: all totals match.")


if __name__ == "__main__":
    main()
