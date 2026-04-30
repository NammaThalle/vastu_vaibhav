"""use fixed point money

Revision ID: a7b8c9d0e1f2
Revises: f4c9a0b1d2e3
Create Date: 2026-05-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f4c9a0b1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MONEY = sa.Numeric(12, 2)


def _alter_money_column(table: str, column: str, nullable: bool) -> None:
    with op.batch_alter_table(table, schema=None) as batch_op:
        batch_op.alter_column(
            column,
            existing_type=sa.Float(),
            type_=MONEY,
            existing_nullable=nullable,
        )


def upgrade() -> None:
    _alter_money_column("clients", "total_fees_fixed", True)
    _alter_money_column("payments", "amount", False)
    _alter_money_column("service_entries", "amount", False)
    _alter_money_column("visits", "amount", True)
    _alter_money_column("visits", "fee_incurred", True)
    _alter_money_column("service_catalog", "base_price", False)
    _alter_money_column("service_addons", "price", False)
    _alter_money_column("client_services", "calculated_fee", False)


def downgrade() -> None:
    with op.batch_alter_table("client_services", schema=None) as batch_op:
        batch_op.alter_column("calculated_fee", existing_type=MONEY, type_=sa.Float(), existing_nullable=False)
    with op.batch_alter_table("service_addons", schema=None) as batch_op:
        batch_op.alter_column("price", existing_type=MONEY, type_=sa.Float(), existing_nullable=False)
    with op.batch_alter_table("service_catalog", schema=None) as batch_op:
        batch_op.alter_column("base_price", existing_type=MONEY, type_=sa.Float(), existing_nullable=False)
    with op.batch_alter_table("visits", schema=None) as batch_op:
        batch_op.alter_column("fee_incurred", existing_type=MONEY, type_=sa.Float(), existing_nullable=True)
        batch_op.alter_column("amount", existing_type=MONEY, type_=sa.Float(), existing_nullable=True)
    with op.batch_alter_table("service_entries", schema=None) as batch_op:
        batch_op.alter_column("amount", existing_type=MONEY, type_=sa.Float(), existing_nullable=False)
    with op.batch_alter_table("payments", schema=None) as batch_op:
        batch_op.alter_column("amount", existing_type=MONEY, type_=sa.Float(), existing_nullable=False)
    with op.batch_alter_table("clients", schema=None) as batch_op:
        batch_op.alter_column("total_fees_fixed", existing_type=MONEY, type_=sa.Float(), existing_nullable=True)
