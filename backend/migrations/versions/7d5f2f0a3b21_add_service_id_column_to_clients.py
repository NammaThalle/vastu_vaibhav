"""Add service_id column to clients

Revision ID: 7d5f2f0a3b21
Revises: 94261d6ace72
Create Date: 2026-04-17 11:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7d5f2f0a3b21"
down_revision: Union[str, Sequence[str], None] = "94261d6ace72"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("clients", schema=None) as batch_op:
        batch_op.add_column(sa.Column("service_id", sa.String(), nullable=True))
        batch_op.create_foreign_key(
            "fk_clients_service_id",
            "service_catalog",
            ["service_id"],
            ["id"],
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("clients", schema=None) as batch_op:
        batch_op.drop_constraint("fk_clients_service_id", type_="foreignkey")
        batch_op.drop_column("service_id")
