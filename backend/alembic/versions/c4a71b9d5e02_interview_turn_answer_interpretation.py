"""interview_turns.answer_interpretation (capa de comprensión, B14)

Columna aditiva y nullable: guarda la lectura interpretada de la respuesta
(`AnswerInterpretation` de `app/ai/contracts/base.py`) que la capa de
comprensión produce antes de decidir la siguiente pregunta. `answer_text`
sigue guardando el transcript crudo — esta columna es una lectura derivada,
nunca un reemplazo de la evidencia original.

Revision ID: c4a71b9d5e02
Revises: 8e0d0eca8c69
Create Date: 2026-09-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c4a71b9d5e02'
down_revision: Union[str, None] = '8e0d0eca8c69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'interview_turns',
        sa.Column('answer_interpretation', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('interview_turns', 'answer_interpretation')
