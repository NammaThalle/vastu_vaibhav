"""add service entry type

Revision ID: f4c9a0b1d2e3
Revises: e8a1f2c3d4b5
Create Date: 2026-05-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4c9a0b1d2e3"
down_revision: Union[str, Sequence[str], None] = "e8a1f2c3d4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("service_entries", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "entry_type",
                sa.String(),
                nullable=False,
                server_default="charge",
            )
        )

    op.execute(
        sa.text(
            """
            UPDATE service_entries
            SET entry_type = 'discount',
                amount = ABS(amount)
            WHERE amount < 0
            """
        )
    )

    with op.batch_alter_table("service_entries", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_service_entries_amount_non_negative",
            "amount >= 0",
        )
        batch_op.create_check_constraint(
            "ck_service_entries_entry_type",
            "entry_type IN ('charge', 'discount')",
        )


def downgrade() -> None:
    with op.batch_alter_table("service_entries", schema=None) as batch_op:
        batch_op.drop_constraint("ck_service_entries_entry_type", type_="check")
        batch_op.drop_constraint("ck_service_entries_amount_non_negative", type_="check")

    op.execute(
        sa.text(
            """
            UPDATE service_entries
            SET amount = -ABS(amount)
            WHERE entry_type = 'discount'
            """
        )
    )

    with op.batch_alter_table("service_entries", schema=None) as batch_op:
        batch_op.drop_column("entry_type")
