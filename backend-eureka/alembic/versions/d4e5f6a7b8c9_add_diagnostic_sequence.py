"""add diagnostic sequence definition

Revision ID: d4e5f6a7b8c9
Revises: f7a8b9c0d1e2
Create Date: 2026-08-31

Crea la definición de secuencia para diagnósticos.
Formato: REG-SST-{year}-{number:03}
Scope: company + año → reinicia cada año por empresa.
Ejemplo: REG-SST-2026-001, REG-SST-2026-002, REG-SST-2027-001
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "d26a8868e46e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Insertar la definición de secuencia para diagnósticos
    op.execute("""
        INSERT INTO sequence_definitions
            (name, code, template, padding, increment, reset_policy,
             is_active, description, created_at, updated_at)
        VALUES
            (
                'Diagnóstico Anexo 1',
                'diagnostic',
                'REG-SST-{year}-{number:03}',
                3,
                1,
                'YEARLY',
                true,
                'Numeración automática de diagnósticos por empresa y año. '
                'Formato: REG-SST-YYYY-NNN. Reinicia cada año.',
                NOW(),
                NOW()
            )
        ON CONFLICT (code) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DELETE FROM sequence_definitions WHERE code = 'diagnostic'")