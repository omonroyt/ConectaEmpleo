"""`GET /admin/ai-invocations` (B13): lista paginada de la tabla
`ai_invocations`, para depurar la demo en vivo (qué operación se llamó, con
qué adaptador/proveedor/modelo, cuánto tardó, cuántos tokens, si falló y por
qué) sin tener que abrir Postgres directamente.

"Protegido" en el sentido de `docs/build/00_BUILD_STATE.md` (fila B13):
cualquier usuario autenticado (candidato o empresa) puede leerlo -- el
proyecto no tiene un rol `ADMIN` propio todavía (`Role` del contrato es solo
`CANDIDATE | COMPANY`), así que exigir un rol que no existe dejaría el
endpoint inalcanzable. Introducir un rol nuevo solo para esta pantalla de
depuración de demo es alcance especulativo fuera de lo que pide la tarea.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.models import AIInvocation
from app.core.security import get_current_user
from app.database import get_db
from app.modules.admin.schemas import AIInvocationOut, Paginated
from app.modules.identity.models import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ai-invocations", response_model=Paginated[AIInvocationOut])
def list_ai_invocations(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    operation: str | None = Query(default=None),
    status_: str | None = Query(default=None, alias="status"),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Paginated[AIInvocationOut]:
    stmt = select(AIInvocation)
    if operation:
        stmt = stmt.where(AIInvocation.operation == operation)
    if status_:
        stmt = stmt.where(AIInvocation.status == status_)

    total = len(db.execute(stmt).all())
    rows = (
        db.execute(stmt.order_by(AIInvocation.created_at.desc()).limit(limit).offset(offset))
        .scalars()
        .all()
    )
    return Paginated(items=[AIInvocationOut.model_validate(r) for r in rows], total=total)
