"""tts usage events

Revision ID: 3f5adcf29fbb
Revises: 879be33e9940
Create Date: 2026-09-09 14:16:56.790245

Escrita a mano, no autogenerada: `alembic revision --autogenerate` en este
punto también detectó `interview_questions` (trabajo en curso de otro
agente en paralelo, B2b, sin migración propia todavía) porque comparte la
misma `Base.metadata`. Esta migración toca **solo** `tts_usage_events`
(docs/build B12, contador persistido de caracteres de TTS — ver
`app/ai/voice/models.py`).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3f5adcf29fbb'
down_revision: Union[str, None] = '879be33e9940'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tts_usage_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('characters', sa.Integer(), nullable=False),
        sa.Column('persona', sa.String(length=20), nullable=False),
        sa.Column('voice_id', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('turn_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('tts_usage_events')
