"""Add visit amount and ledger visit link

Revision ID: c1b6f8d9e2a4
Revises: 7d5f2f0a3b21
Create Date: 2026-04-17 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c1b6f8d9e2a4"
down_revision: Union[str, Sequence[str], None] = "7d5f2f0a3b21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("visits", schema=None) as batch_op:
        batch_op.add_column(sa.Column("amount", sa.Float(), nullable=True))

    with op.batch_alter_table("service_entries", schema=None) as batch_op:
        batch_op.add_column(sa.Column("visit_id", sa.String(), nullable=True))
        batch_op.create_foreign_key(
            "fk_service_entries_visit_id",
            "visits",
            ["visit_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("service_entries", schema=None) as batch_op:
        batch_op.drop_constraint("fk_service_entries_visit_id", type_="foreignkey")
        batch_op.drop_column("visit_id")

    with op.batch_alter_table("visits", schema=None) as batch_op:
        batch_op.drop_column("amount")
