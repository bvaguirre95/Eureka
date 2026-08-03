"""add_inspection_templates_1

Revision ID: d91274c43209
Revises: 2d9057c191b3
Create Date: 2026-07-23 11:59:20.214621

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd91274c43209'
down_revision: Union[str, None] = '2d9057c191b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    structure_type_enum = postgresql.ENUM(
        'FORMULARIO',
        'MATRIZ',
        'FORMULARIO_MATRIZ',
        name='structure_type_enum',
        create_type=False
    )

    op.add_column(
        'inspection_types',
        sa.Column(
            'structure_type',
            structure_type_enum,
            nullable=True
        )
    )

    op.execute("""
        UPDATE inspection_types
        SET structure_type = 'FORMULARIO'
        WHERE structure_type IS NULL
    """)

    op.alter_column(
        'inspection_types',
        'structure_type',
        existing_type=structure_type_enum,
        nullable=False
    )


def downgrade() -> None:
    op.drop_column('inspection_types', 'structure_type')