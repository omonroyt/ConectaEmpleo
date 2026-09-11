"""Cuentas del jurado para la evaluación del hackatón en producción.

Crea 5 candidatos listos para presentar su entrevista y 3 empresas verificadas,
cada una con las 3 vacantes de la demo y su ranking ya calculado.

- **Candidatos** (`candidato1..5@monroy.group`): familia `ADMIN_ASSISTANT` y
  `status="CV_READY"`, así que al entrar su siguiente paso es la entrevista
  (`candidates.service.compute_status_view`). El CV es genérico a propósito
  --un solo puesto de auxiliar administrativo, sin empresa ni logros
  concretos-- para que cada jurado conteste con su propia experiencia sin
  contradecir un historial ajeno.
- **Empresas** (`empresa1..3@monroy.group`): la vacante de auxiliar
  administrativo pide solo competencias que cubre la entrevista corta
  (`INTERVIEW_DEMO_MODE=true`: las 3 primeras técnicas y las 3 primeras
  conductuales del banco), para que nadie salga penalizado por algo que no se
  le preguntó. Al terminar cada entrevista, el ranking de las vacantes abiertas
  de la familia se recalcula solo (`assessments/jobs.py`) y el jurado se ve,
  anónimo, en el talento compatible.

Todas usan `JURY_PASSWORD` (mínimo 10 caracteres), que nunca se versiona: se
entrega al jurado por fuera del repo. Correr la semilla otra vez no duplica
nada y vuelve a fijar esa contraseña. En producción, además, cambia por una
aleatoria la de las cuentas `@demo.mx`: `demo1234` está publicada en el README
y no debe abrir nada en el servidor real.

Uso, después de `app.seeds.run` y `app.seeds.demo` y con `DATABASE_URL` y
`JURY_PASSWORD` definidos: `python -m app.seeds.jury`.
"""

from __future__ import annotations

import secrets
import sys
import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.modules.candidates import service as candidates_service
from app.modules.candidates.models import CandidateProfile
from app.modules.candidates.schemas import CandidateProfilePatch, ExperienceItem
from app.modules.candidates.schemas import Location as CandidateLocation
from app.modules.catalog.models import JobFamily
from app.modules.identity import service as identity_service
from app.modules.identity.models import User
from app.modules.identity.schemas import RegisterInput
from app.seeds.demo import (
    LOCAL_DEMO_PASSWORD,
    VACANCY_SPECS,
    seed_company,
    seed_match_run,
    seed_vacancy,
    use_seed_settings,
)

EMAIL_DOMAIN = "monroy.group"
CANDIDATE_COUNT = 5
JURY_FAMILY = "ADMIN_ASSISTANT"
MIN_PASSWORD_LENGTH = 10

# La vacante de auxiliar administrativo de la demo exige "Confidencialidad"
# (ADMIN_SA_07), que la entrevista corta no pregunta. En las empresas del jurado
# se cambia por "Atención al detalle y responsabilidad" (ADMIN_SA_02), que sí
# entra en las 6 preguntas.
JURY_VACANCY_SPECS = [
    {
        **spec,
        "requirements": [
            ("ADMIN_HA_01", None, "Dominio de Excel y hojas de cálculo", "MANDATORY", 3, 30),
            ("ADMIN_HA_03", None, "Gestión documental", "MANDATORY", 3, 25),
            ("ADMIN_SA_02", None, "Atención al detalle y responsabilidad", "MANDATORY", 2, 20),
            (None, "EXCEL_INTERMEDIATE", "Excel intermedio", "DESIRABLE", 2, 25),
        ],
    }
    if spec["family"] == JURY_FAMILY
    else spec
    for spec in VACANCY_SPECS
]

JURY_COMPANIES = [
    dict(
        email=f"empresa1@{EMAIL_DOMAIN}",
        legal_name="Distribuidora Central del Bajío S.A. de C.V.",
        trade_name="Distribuidora Central del Bajío",
        industry="Distribución y comercio",
        size="51-200",
        city="León",
        state="Guanajuato",
        description="Distribuidora regional de abarrotes y consumo para tiendas y cadenas del Bajío.",
    ),
    dict(
        email=f"empresa2@{EMAIL_DOMAIN}",
        legal_name="Operadora Logística de Occidente S.A. de C.V.",
        trade_name="Operadora Logística de Occidente",
        industry="Logística y transporte",
        size="51-200",
        city="León",
        state="Guanajuato",
        description="Almacenaje, patio de maniobras y transporte de carga para clientes industriales.",
    ),
    dict(
        email=f"empresa3@{EMAIL_DOMAIN}",
        legal_name="Servicios Industriales del Centro S.A. de C.V.",
        trade_name="Servicios Industriales del Centro",
        industry="Manufactura y servicios industriales",
        size="51-200",
        city="León",
        state="Guanajuato",
        description="Mantenimiento, montaje y operación de equipo para plantas del corredor industrial.",
    ),
]


def _candidate_email(number: int) -> str:
    return f"candidato{number}@{EMAIL_DOMAIN}"


def _seed_jury_candidate(db: Session, *, number: int, family: JobFamily, password: str) -> bool:
    """Devuelve `True` si la cuenta es nueva. Una que ya existe no se toca (puede
    estar a media entrevista); `main` solo le vuelve a fijar la contraseña."""

    email = _candidate_email(number)
    if db.execute(select(User.id).where(User.email == email)).first() is not None:
        return False

    user = identity_service.register_user(db, RegisterInput(email=email, password=password, role="CANDIDATE"))
    profile = candidates_service.get_profile_by_user_id(db, user_id=user.id)
    candidates_service.set_job_family(db, profile, job_family_id=family.id)
    candidates_service.apply_patch(
        db,
        profile,
        CandidateProfilePatch(
            full_name=f"Jurado {number}",
            location=CandidateLocation(city="León", state="Guanajuato"),
            availability="IMMEDIATE",
            salary_expectation_min=9500,
            salary_expectation_max=12500,
            experience=[
                ExperienceItem(
                    id=uuid.uuid4().hex,
                    company="Experiencia en oficina",
                    position="Auxiliar administrativo",
                    start_date=f"{date.today().year - 3}-01-01",
                    end_date=None,
                    is_current=True,
                    description="Agenda, documentación, captura de información y atención a clientes.",
                    skills=[],
                )
            ],
            bio="Experiencia en tareas administrativas: agenda, documentación y atención a clientes.",
        ),
    )
    # El mismo estado que deja confirmar el CV en el flujo real: sigue la entrevista.
    profile.status = "CV_READY"
    db.add(profile)
    db.commit()
    return True


def _set_password(db: Session, *, email: str, password: str) -> None:
    user = db.execute(select(User).where(User.email == email)).scalar_one()
    user.password_hash = hash_password(password)
    db.commit()


def _lock_public_demo_accounts(db: Session) -> int:
    users = db.execute(select(User).where(User.email.like("%@demo.mx"))).scalars().all()
    for user in users:
        user.password_hash = hash_password(secrets.token_urlsafe(24))
    db.commit()
    return len(users)


def main() -> None:
    use_seed_settings()
    settings = get_settings()
    password = settings.jury_password.strip()
    if len(password) < MIN_PASSWORD_LENGTH or password == LOCAL_DEMO_PASSWORD:
        sys.exit(
            "JURY_PASSWORD no está definida o es muy corta: mínimo 10 caracteres, y no puede ser "
            "la contraseña demo pública. Defínela como variable de entorno o en backend/.env y "
            "vuelve a correr la semilla."
        )

    db = SessionLocal()
    try:
        family = db.execute(select(JobFamily).where(JobFamily.code == JURY_FAMILY)).scalar_one()
        evaluated = db.execute(
            select(func.count())
            .select_from(CandidateProfile)
            .where(CandidateProfile.job_family_id == family.id, CandidateProfile.status == "EVALUATED")
        ).scalar_one()
        if evaluated == 0:
            sys.exit(
                "Corre primero `python -m app.seeds.demo`: sin candidatos evaluados, el ranking "
                "de las empresas del jurado saldría vacío."
            )

        print("=== Cuentas del jurado ===")
        print(f"-- {CANDIDATE_COUNT} candidatos listos para la entrevista ({JURY_FAMILY}) --")
        for number in range(1, CANDIDATE_COUNT + 1):
            created = _seed_jury_candidate(db, number=number, family=family, password=password)
            print(f"   {_candidate_email(number)}{'' if created else ' (ya existía)'}")

        print(f"-- {len(JURY_COMPANIES)} empresas con sus vacantes y ranking --")
        for spec in JURY_COMPANIES:
            company = seed_company(db, spec, password=password)
            for vacancy_spec in JURY_VACANCY_SPECS:
                seed_match_run(db, seed_vacancy(db, company, vacancy_spec))
            print(f"   {spec['email']}: {spec['trade_name']}")

        emails = [_candidate_email(n) for n in range(1, CANDIDATE_COUNT + 1)]
        emails += [spec["email"] for spec in JURY_COMPANIES]
        for email in emails:
            _set_password(db, email=email, password=password)

        if settings.environment == "production":
            locked = _lock_public_demo_accounts(db)
            print(f"-- {locked} cuentas @demo.mx con contraseña aleatoria: demo1234 no abre nada aquí --")

        print("=== Listo. Entrega a cada jurado su correo y la contraseña de JURY_PASSWORD. ===")
    finally:
        db.close()


if __name__ == "__main__":
    main()
