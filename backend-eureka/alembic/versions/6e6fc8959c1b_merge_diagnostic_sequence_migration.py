"""merge diagnostic sequence migration

Revision ID: 6e6fc8959c1b
Revises: 19344eaf55f6, d4e5f6a7b8c9
Create Date: 2026-09-04 19:36:59.430217

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e6fc8959c1b'
down_revision: Union[str, None] = ('19344eaf55f6', 'd4e5f6a7b8c9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
