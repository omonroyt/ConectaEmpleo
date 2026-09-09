"""Mocks P2 (`docs/build/02_API_CONTRACT.md` §4, fila `mocks.*`):
`GET /notifications` · `GET /messages` · `GET /billing/plans`.

Contenido estático (no hay tablas propias todavía, igual que
`frontend/src/api/mock/seed/misc.ts`, del que se copian los mismos textos de
demo): estas tres pantallas son P2 y no forman parte del golden path
verificable de la tarea, así que no justifican un modelo de base de datos
propio en esta fase. Sin autenticación, igual que el mock (`api/mock/index.ts`
no revisa sesión para estas tres rutas).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from app.modules.misc.schemas import MessageThread, Notification, Plan

router = APIRouter(tags=["misc"])


def _hours_ago(hours: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=hours)


@router.get("/notifications", response_model=list[Notification])
def get_notifications() -> list[Notification]:
    return [
        Notification(
            id="not_1",
            title="Tu perfil de talento está listo",
            body="Ya generamos tu Perfil de Talento Verificado con base en tu entrevista.",
            created_at=_hours_ago(3),
            read=False,
        ),
        Notification(
            id="not_2",
            title="Nueva vacante compatible",
            body="Encontramos una vacante de Logística del Bajío que coincide con tu perfil.",
            created_at=_hours_ago(26),
            read=True,
        ),
        Notification(
            id="not_3",
            title="Recordatorio",
            body="Te falta confirmar los datos extraídos de tu CV.",
            created_at=_hours_ago(50),
            read=True,
        ),
    ]


@router.get("/messages", response_model=list[MessageThread])
def get_messages() -> list[MessageThread]:
    return [
        MessageThread(
            id="thr_1",
            counterpart="Logística del Bajío",
            last_message="Gracias por tu interés, seguimos revisando candidatos.",
            updated_at=_hours_ago(5),
            unread=1,
        ),
        MessageThread(
            id="thr_2",
            counterpart="Soporte Conecta Empleo",
            last_message="Cualquier duda sobre tu perfil, escríbenos por aquí.",
            updated_at=_hours_ago(72),
            unread=0,
        ),
    ]


@router.get("/billing/plans", response_model=list[Plan])
def get_plans() -> list[Plan]:
    return [
        Plan(
            id="plan_starter",
            name="Starter",
            price_mxn=0,
            features=["1 vacante activa", "Ranking anónimo de candidatos", "Hasta 3 desbloqueos al mes"],
            highlighted=False,
        ),
        Plan(
            id="plan_crecimiento",
            name="Crecimiento",
            price_mxn=1490,
            features=[
                "5 vacantes activas",
                "Desbloqueos ilimitados",
                "Comparador de finalistas",
                "Soporte prioritario",
            ],
            highlighted=True,
        ),
        Plan(
            id="plan_empresarial",
            name="Empresarial",
            price_mxn=3990,
            features=[
                "Vacantes ilimitadas",
                "Múltiples usuarios de empresa",
                "Reportes exportables",
                "Gerente de cuenta dedicado",
            ],
            highlighted=False,
        ),
    ]
