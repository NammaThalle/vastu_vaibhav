"""add core value constraints

Revision ID: e8a1f2c3d4b5
Revises: b3d5e2a7f1c8
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8a1f2c3d4b5"
down_revision: Union[str, Sequence[str], None] = "b3d5e2a7f1c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("service_addons"):
        op.create_table(
            "service_addons",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("service_catalog_id", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("price", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.CheckConstraint("price >= 0", name="ck_service_addons_price_non_negative"),
            sa.ForeignKeyConstraint(["service_catalog_id"], ["service_catalog.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    with op.batch_alter_table("clients", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_clients_total_fees_fixed_non_negative",
            "total_fees_fixed >= 0",
        )

    with op.batch_alter_table("payments", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_payments_amount_positive",
            "amount > 0",
        )

    with op.batch_alter_table("service_catalog", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_service_catalog_base_price_non_negative",
            "base_price >= 0",
        )
        batch_op.create_check_constraint(
            "ck_service_catalog_max_free_visits_non_negative",
            "max_free_visits >= 0",
        )

    if inspector.has_table("service_addons"):
        with op.batch_alter_table("service_addons", schema=None) as batch_op:
            batch_op.create_check_constraint(
                "ck_service_addons_price_non_negative",
                "price >= 0",
            )

    with op.batch_alter_table("visits", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_visits_amount_non_negative",
            "amount IS NULL OR amount >= 0",
        )
        batch_op.create_check_constraint(
            "ck_visits_fee_incurred_non_negative",
            "fee_incurred >= 0",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    with op.batch_alter_table("visits", schema=None) as batch_op:
        batch_op.drop_constraint("ck_visits_fee_incurred_non_negative", type_="check")
        batch_op.drop_constraint("ck_visits_amount_non_negative", type_="check")

    if inspector.has_table("service_addons"):
        with op.batch_alter_table("service_addons", schema=None) as batch_op:
            batch_op.drop_constraint("ck_service_addons_price_non_negative", type_="check")

    with op.batch_alter_table("service_catalog", schema=None) as batch_op:
        batch_op.drop_constraint("ck_service_catalog_max_free_visits_non_negative", type_="check")
        batch_op.drop_constraint("ck_service_catalog_base_price_non_negative", type_="check")

    with op.batch_alter_table("payments", schema=None) as batch_op:
        batch_op.drop_constraint("ck_payments_amount_positive", type_="check")

    with op.batch_alter_table("clients", schema=None) as batch_op:
        batch_op.drop_constraint("ck_clients_total_fees_fixed_non_negative", type_="check")
