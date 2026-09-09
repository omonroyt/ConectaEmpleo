"""Seed idempotente de **demo** (B13): 15 candidatos `EVALUATED` (5 por
familia) con perfiles diferenciados de verdad, 1 empresa verificada con 3
vacantes `OPEN` (una por familia) y un match run ya ejecutado por vacante, más
los 3 usuarios demo de `docs/build/02_API_CONTRACT.md` §5.

Uso: `python -m app.seeds.demo` (con `DATABASE_URL` explícito). Requiere que
`python -m app.seeds.run` ya se haya corrido antes (catálogo de familias,
competencias, skills). Correrlo dos veces no duplica nada: cada entidad se
busca por su clave natural (email, título de vacante, existencia de un
`MatchRun`) antes de crear.

Deliberadamente **no usa HTTP ni `BackgroundTasks`**: llama directo a las
mismas funciones de servicio que ya usan los routers
(`interviews.service`, `assessments.service`, `matching.service`) con una
única `Session` de `SessionLocal()`, exactamente en el mismo orden que
`POST /interviews/{id}/complete` (ver `app/modules/interviews/router.py`) y
`app/modules/assessments/jobs.py` — así no depende de un servidor uvicorn
corriendo (a diferencia de `scripts/verify_b9_b10.py`, que sí lo necesita
porque el job `MATCH_RUN` se dispara vía `BackgroundTasks`).

Las evaluaciones citan turnos reales (I-02) porque el candidato realmente
"contesta" la entrevista completa a través de `InterviewOrchestrator`
(`interviews.service.create_session/next_question/submit_answer`) con el
`DeterministicAdapter` (cero tokens de LLM): la longitud de cada respuesta
controla el nivel de rúbrica (`app/ai/adapters/deterministic.py::_band_for_words`
— 25+ palabras -> nivel 4, 15-24 -> nivel 3, 6-14 -> nivel 2, <6 -> nivel 1),
así que variar la longitud por candidato basta para producir un ranking que
discrimina de verdad, sin inventar evaluaciones.
"""

from __future__ import annotations

import uuid
from datetime import date

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.modules.assessments import service as assessments_service
from app.modules.candidates import service as candidates_service
from app.modules.candidates.models import CandidateProfile
from app.modules.candidates.schemas import (
    CandidateProfilePatch,
    EducationItem,
    ExperienceItem,
)
from app.modules.candidates.schemas import Location as CandidateLocation
from app.modules.catalog.models import Competency, JobFamily
from app.modules.companies import service as companies_service
from app.modules.companies.models import Company
from app.modules.companies.schemas import CompanyPatch
from app.modules.companies.schemas import Location as CompanyLocation
from app.modules.documents.models import Document
from app.modules.identity.models import User
from app.modules.identity.schemas import RegisterInput
from app.modules.identity import service as identity_service
from app.modules.interviews import service as interviews_service
from app.modules.interviews.models import InterviewSession
from app.modules.interviews.schemas import AnswerInput
from app.modules.marketplace import service as marketplace_service
from app.modules.matching import service as matching_service
from app.modules.matching.models import MatchRun
from app.modules.vacancies import service as vacancies_service
from app.modules.vacancies.models import Vacancy
from app.modules.vacancies.schemas import RequirementInput, VacancyInput, VacancyPatch
from app.modules.vacancies.schemas import Location as VacancyLocation

logger = structlog.get_logger("seeds.demo")

DEMO_PASSWORD = "demo1234"

# ---------------------------------------------------------------------------
# Helpers de identidad / perfil
# ---------------------------------------------------------------------------


def _get_or_create_user(db: Session, *, email: str, role: str) -> tuple[User, bool]:
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        return existing, False
    user = identity_service.register_user(db, RegisterInput(email=email, password=DEMO_PASSWORD, role=role))
    return user, True


def _word_answer(n: int) -> str:
    """Respuesta determinista de exactamente `n` palabras (sin LLM).

    El contenido léxico no importa para el score (`_band_for_words` del
    `DeterministicAdapter` solo cuenta palabras); se usa vocabulario de acción
    genérico y plausible en español para que se lea como una respuesta real
    en las pantallas de detalle de turno.
    """

    bank = [
        "Reviso", "verifico", "documento", "comunico", "coordino", "explico",
        "detallo", "confirmo", "reporto", "resuelvo", "organizo", "priorizo",
        "superviso", "registro", "valido",
    ]
    words = (bank * ((n // len(bank)) + 1))[:n]
    return " ".join(words)


_FOLLOW_UP_ANSWER = "Ya lo mencioné antes, con el mismo ejemplo que acabo de dar."

RANK_WORDS = {1: 30, 2: 22, 3: 16, 4: 9, 5: 4}


def _competency_by_code(db: Session, code: str) -> Competency:
    return db.execute(select(Competency).where(Competency.code == code)).scalar_one()


def _add_claim(db: Session, *, candidate_id: uuid.UUID, skill_code: str, statement: str, claimed_level: int) -> None:
    from app.modules.documents.models import Claim

    existing = db.execute(
        select(Claim).where(Claim.candidate_id == candidate_id, Claim.skill_code == skill_code)
    ).scalar_one_or_none()
    if existing is not None:
        return
    db.add(
        Claim(
            candidate_id=candidate_id,
            source="CV",
            skill_code=skill_code,
            statement=statement,
            claimed_level=claimed_level,
            needs_validation=False,
        )
    )
    db.commit()


def _run_full_interview(
    db: Session, profile: CandidateProfile, *, rank: int, special_answers: dict[str, str] | None = None
) -> InterviewSession:
    special_answers = special_answers or {}
    session_schema = interviews_service.create_session(db, profile=profile, mode="TEXT")
    session_id = session_schema.id

    guard = 0
    while guard < 60:
        guard += 1
        nxt = interviews_service.next_question(db, session_id=session_id, candidate_id=profile.id)
        if nxt.finished or nxt.turn is None:
            break
        turn = nxt.turn
        if turn.is_follow_up:
            answer = _FOLLOW_UP_ANSWER
        else:
            answer = special_answers.get(turn.target_competency_code) or _word_answer(RANK_WORDS[rank])
        interviews_service.submit_answer(
            db, session_id=session_id, candidate_id=profile.id, payload=AnswerInput(answer_text=answer, mode="TEXT")
        )

    session_row = interviews_service.ensure_completed(db, session_id=session_id, candidate_id=profile.id)

    profile.status = "PENDING_EVALUATION"
    db.add(profile)
    db.commit()

    result = assessments_service.run_evaluation(db, session_row)
    assessments_service.persist_evaluations(db, candidate_id=profile.id, session=session_row, result=result)
    assessments_service.build_and_persist_talent_profile(db, session=session_row)
    return session_row


def _issue_verified_document(db: Session, *, user_id: uuid.UUID) -> Document:
    doc = Document(
        owner_user_id=user_id,
        type="CERTIFICATION",
        storage_key=f"demo/{uuid.uuid4().hex}.pdf",
        original_filename="certificado.pdf",
        mime_type="application/pdf",
        size_bytes=204800,
        status="UPLOADED",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


# ---------------------------------------------------------------------------
# Especificaciones de los 15 candidatos (equivalentes a
# `frontend/src/api/mock/seed/candidates.ts`: mismos nombres, ciudades, años
# de experiencia y `rankHint` por familia, para que la demo se vea igual)
# ---------------------------------------------------------------------------

CITY_STATE = {
    "León": "Guanajuato", "Guadalajara": "Jalisco", "Ciudad de México": "Ciudad de México",
    "Querétaro": "Querétaro", "Irapuato": "Guanajuato", "Monterrey": "Nuevo León",
    "Celaya": "Guanajuato", "Silao": "Guanajuato", "Aguascalientes": "Aguascalientes",
    "Puebla": "Puebla", "Guanajuato": "Guanajuato", "Salamanca": "Guanajuato",
    "Toluca": "México", "San Luis Potosí": "San Luis Potosí",
}

CANDIDATE_SPECS = [
    # ---- ADMIN_ASSISTANT ----
    dict(family="ADMIN_ASSISTANT", email="cand-8a21@demo.mx", full_name="Ana Karen Flores Jiménez", city="León",
         gender="Femenino", birth_year=1996, phone="4771230011", availability="IMMEDIATE",
         salary_min=9000, salary_max=12000, years=4, company="Grupo Comercial Bajío",
         position="Auxiliar administrativa", degree="Licenciatura en Administración (trunca)",
         institution="Universidad Tecnológica de León", rank=2),
    dict(family="ADMIN_ASSISTANT", email="cand-3f09@demo.mx", full_name="Diego Alejandro Ramírez Torres",
         city="Guadalajara", gender="Masculino", birth_year=1993, phone="3312340022", availability="TWO_WEEKS",
         salary_min=10000, salary_max=13500, years=6, company="Distribuidora Occidente",
         position="Asistente de dirección", degree="Técnico en Administración",
         institution="CONALEP Guadalajara", rank=1,
         verified_skills=["EXCEL_ADVANCED", "FILING_SYSTEMS", "CUSTOMER_SERVICE_PHONE"],
         claim=("ADMIN_HA_01", "Tengo amplio dominio de Excel y hojas de cálculo.", 4)),
    dict(family="ADMIN_ASSISTANT", email="cand-c412@demo.mx", full_name="Lucía Fernanda Morales Castillo",
         city="Ciudad de México", gender="Femenino", birth_year=1998, phone="5512350033",
         availability="ONE_MONTH", salary_min=11000, salary_max=14000, years=3,
         company="Corporativo Reforma", position="Recepcionista y auxiliar de oficina",
         degree="Bachillerato general", institution="Preparatoria 6 CDMX", rank=4),
    dict(family="ADMIN_ASSISTANT", email="cand-9b77@demo.mx", full_name="José Manuel Herrera Vázquez",
         city="Querétaro", gender="Masculino", birth_year=1990, phone="4421360044",
         availability="IMMEDIATE", salary_min=10500, salary_max=13000, years=8,
         company="Parque Industrial Querétaro", position="Coordinador administrativo",
         degree="Licenciatura en Contaduría", institution="Universidad Autónoma de Querétaro", rank=3,
         verified_skills=["OUTLOOK_MANAGEMENT"]),
    dict(family="ADMIN_ASSISTANT", email="cand-5e63@demo.mx", full_name="Paola Guadalupe Sánchez Reyes",
         city="Irapuato", gender="Femenino", birth_year=2000, phone="4621370055", availability="TWO_WEEKS",
         salary_min=8500, salary_max=11000, years=2, company="Agroindustrias del Bajío",
         position="Auxiliar de archivo", degree="Bachillerato técnico en Ofimática",
         institution="CBTIS 108 Irapuato", rank=5,
         claim=("ADMIN_HA_01", "Tengo dominio avanzado de Excel y hojas de cálculo.", 4),
         risky={"ADMIN_SA_07": "Le compartiría el dato sin más trámite."}),
    # ---- HEAVY_MACHINERY_OPERATOR ----
    dict(family="HEAVY_MACHINERY_OPERATOR", email="cand-1d48@demo.mx", full_name="Juan Carlos Mendoza Ríos",
         city="Monterrey", gender="Masculino", birth_year=1988, phone="8112340066", availability="IMMEDIATE",
         salary_min=13000, salary_max=17000, years=10, company="Construcciones del Norte",
         position="Operador de retroexcavadora", degree="Bachillerato técnico industrial",
         institution="CBTIS 3 Monterrey", rank=1,
         verified_skills=["EXCAVATOR_OPERATION", "PPE_USAGE", "DEFENSIVE_DRIVING"],
         claim=("HEAVY_HM_01", "Tengo amplia experiencia real operando distintas máquinas.", 4)),
    dict(family="HEAVY_MACHINERY_OPERATOR", email="cand-7a90@demo.mx", full_name="Roberto Carlos Aguilar Domínguez",
         city="Celaya", gender="Masculino", birth_year=1991, phone="4611350077", availability="TWO_WEEKS",
         salary_min=12500, salary_max=16000, years=7, company="Constructora Bajío Fuerte",
         position="Operador de cargador frontal", degree="Secundaria técnica",
         institution="Escuela Secundaria Técnica 12", rank=2, verified_skills=["LOADER_OPERATION"]),
    dict(family="HEAVY_MACHINERY_OPERATOR", email="cand-2c55@demo.mx", full_name="Miguel Ángel Torres Salinas",
         city="Silao", gender="Masculino", birth_year=1985, phone="4721360088", availability="IMMEDIATE",
         salary_min=14000, salary_max=18000, years=13, company="Grupo Industrial Silao",
         position="Operador de grúa", degree="Bachillerato técnico industrial",
         institution="CONALEP Silao", rank=3),
    dict(family="HEAVY_MACHINERY_OPERATOR", email="cand-6f31@demo.mx", full_name="Francisco Javier Cruz Ortega",
         city="Aguascalientes", gender="Masculino", birth_year=1994, phone="4491370099", availability="ONE_MONTH",
         salary_min=12000, salary_max=15500, years=5, company="Obras Viales Aguascalientes",
         position="Operador de bulldozer", degree="Bachillerato general",
         institution="Preparatoria Uno Aguascalientes", rank=4),
    dict(family="HEAVY_MACHINERY_OPERATOR", email="cand-4b26@demo.mx", full_name="Alejandro Gómez Villanueva",
         city="Puebla", gender="Masculino", birth_year=1997, phone="2221380010", availability="IMMEDIATE",
         salary_min=11500, salary_max=15000, years=3, company="Edificaciones del Sur",
         position="Operador de maquinaria pesada", degree="Bachillerato técnico industrial",
         institution="CBTIS 25 Puebla", rank=5,
         claim=("HEAVY_HM_01", "Tengo amplia experiencia real operando distintas máquinas.", 4),
         risky={"HEAVY_HM_05": "Seguiría operando la máquina pese a la fuga."}),
    # ---- WAREHOUSE_SUPERVISOR ----
    dict(family="WAREHOUSE_SUPERVISOR", email="maria@demo.mx", full_name="María José Hernández López",
         city="León", gender="Femenino", birth_year=1992, phone="4771390021", availability="IMMEDIATE",
         salary_min=14000, salary_max=18000, years=6, company="Logística del Bajío S.A. de C.V.",
         position="Encargada de almacén", degree="Licenciatura en Logística (trunca)",
         institution="Universidad Tecnológica de León", rank=1,
         verified_skills=["SAP_WMS", "FORKLIFT_CERTIFICATION", "TEAM_LEADERSHIP_BASIC"],
         claim=("WAREHOUSE_HE_02", "Tengo experiencia sólida verificando entradas de mercancía.", 4)),
    dict(family="WAREHOUSE_SUPERVISOR", email="cand-8e17@demo.mx", full_name="Sergio Iván Martínez Cabrera",
         city="Guanajuato", gender="Masculino", birth_year=1989, phone="4731400032", availability="TWO_WEEKS",
         salary_min=13500, salary_max=17500, years=9, company="Almacenes Guanajuato",
         position="Supervisor de almacén", degree="Bachillerato técnico en Logística",
         institution="CBTIS 45 Guanajuato", rank=2, verified_skills=["BARCODE_SCANNING"]),
    dict(family="WAREHOUSE_SUPERVISOR", email="cand-3d95@demo.mx", full_name="Eduardo Daniel Rojas Peña",
         city="Toluca", gender="Masculino", birth_year=1987, phone="7221420054", availability="ONE_MONTH",
         salary_min=13000, salary_max=17000, years=11, company="Centro de Distribución Toluca",
         position="Jefe de turno de almacén", degree="Bachillerato técnico industrial",
         institution="CBTIS 19 Toluca", rank=3),
    dict(family="WAREHOUSE_SUPERVISOR", email="cand-0c64@demo.mx", full_name="Karla Patricia Delgado Nuñez",
         city="Salamanca", gender="Femenino", birth_year=1995, phone="4641410043", availability="IMMEDIATE",
         salary_min=12500, salary_max=16000, years=4, company="Refaccionaria Industrial Salamanca",
         position="Coordinadora de inventarios", degree="Técnico en Administración de Almacenes",
         institution="CONALEP Salamanca", rank=4),
    dict(family="WAREHOUSE_SUPERVISOR", email="cand-9a38@demo.mx", full_name="Verónica Isabel Campos Rivera",
         city="San Luis Potosí", gender="Femenino", birth_year=1999, phone="4441430065", availability="TWO_WEEKS",
         salary_min=11500, salary_max=15000, years=2, company="Distribuidora Potosina",
         position="Auxiliar de almacén", degree="Bachillerato general", institution="Preparatoria Estatal SLP",
         rank=5, claim=("WAREHOUSE_HE_02", "Tengo experiencia sólida verificando entradas de mercancía.", 4),
         risky={"WAREHOUSE_HE_01": "Ajustaría el sistema para que cuadre con el conteo."}),
]

SKILL_NAMES = {
    "EXCEL_ADVANCED": "Excel avanzado (tablas dinámicas)",
    "FILING_SYSTEMS": "Sistemas de archivo",
    "CUSTOMER_SERVICE_PHONE": "Atención telefónica",
    "OUTLOOK_MANAGEMENT": "Gestión de correo (Outlook)",
    "EXCAVATOR_OPERATION": "Operación de retroexcavadora",
    "PPE_USAGE": "Uso de equipo de protección personal",
    "DEFENSIVE_DRIVING": "Manejo defensivo",
    "LOADER_OPERATION": "Operación de cargador frontal",
    "SAP_WMS": "SAP WMS",
    "FORKLIFT_CERTIFICATION": "Certificación de montacarguista",
    "TEAM_LEADERSHIP_BASIC": "Liderazgo de equipo (básico)",
    "BARCODE_SCANNING": "Escaneo de código de barras",
}


def _seed_candidate(db: Session, spec: dict) -> None:
    existing = db.execute(select(User).where(User.email == spec["email"])).scalar_one_or_none()
    if existing is not None:
        logger.info("demo_candidate_already_seeded", email=spec["email"])
        return

    user, _ = _get_or_create_user(db, email=spec["email"], role="CANDIDATE")
    profile = candidates_service.get_profile_by_user_id(db, user_id=user.id)

    family = db.execute(select(JobFamily).where(JobFamily.code == spec["family"])).scalar_one()
    candidates_service.set_job_family(db, profile, job_family_id=family.id)

    start_year = date.today().year - spec["years"]
    experience = [
        ExperienceItem(
            id=uuid.uuid4().hex,
            company=spec["company"],
            position=spec["position"],
            start_date=f"{start_year}-01-01",
            end_date=None,
            is_current=True,
            description=f"Responsable de {spec['position'].lower()} en {spec['company']}.",
            skills=[],
        )
    ]
    education = [
        EducationItem(
            id=uuid.uuid4().hex,
            institution=spec["institution"],
            degree=spec["degree"],
            start_year=start_year - 2,
            end_year=start_year,
        )
    ]
    candidates_service.apply_patch(
        db,
        profile,
        CandidateProfilePatch(
            full_name=spec["full_name"],
            phone=spec["phone"],
            birth_date=date(spec["birth_year"], 1, 15),
            gender=spec["gender"],
            location=CandidateLocation(city=spec["city"], state=CITY_STATE[spec["city"]]),
            availability=spec["availability"],
            salary_expectation_min=spec["salary_min"],
            salary_expectation_max=spec["salary_max"],
            experience=experience,
            education=education,
            bio=f"{spec['position']} con {spec['years']} años de experiencia en {spec['city']}.",
        ),
    )

    if claim := spec.get("claim"):
        skill_code, statement, level = claim
        _add_claim(db, candidate_id=profile.id, skill_code=skill_code, statement=statement, claimed_level=level)

    session_row = _run_full_interview(db, profile, rank=spec["rank"], special_answers=spec.get("risky"))

    for skill_code in spec.get("verified_skills", []):
        doc = _issue_verified_document(db, user_id=user.id)
        assessments_service.accept_skill_evidence(
            db,
            candidate_id=profile.id,
            skill_code=skill_code,
            skill_name=SKILL_NAMES.get(skill_code, skill_code),
            evidence_type="DOCUMENT",
            accepted_for_verification=True,
            document_id=doc.id,
            notes="Certificación subida durante la demo (semilla B13).",
        )

    logger.info(
        "demo_candidate_seeded", email=spec["email"], family=spec["family"], rank=spec["rank"],
        session_id=str(session_row.id),
    )


# ---------------------------------------------------------------------------
# Empresa + vacantes demo
# ---------------------------------------------------------------------------

VACANCY_SPECS = [
    dict(
        family="ADMIN_ASSISTANT",
        title="Auxiliar administrativo de operaciones",
        description=(
            "Buscamos auxiliar administrativo para dar soporte a la coordinación de "
            "operaciones: agenda, documentación y atención a transportistas y clientes."
        ),
        city="León", state="Guanajuato", salary_min=9500, salary_max=12500, positions=2,
        requirements=[
            ("ADMIN_HA_01", None, "Dominio de Excel y hojas de cálculo", "MANDATORY", 3, 30),
            ("ADMIN_HA_03", None, "Gestión documental", "MANDATORY", 3, 25),
            ("ADMIN_SA_07", None, "Confidencialidad e integridad", "MANDATORY", 2, 20),
            (None, "EXCEL_INTERMEDIATE", "Excel intermedio", "DESIRABLE", 2, 25),
        ],
    ),
    dict(
        family="HEAVY_MACHINERY_OPERATOR",
        title="Operador de maquinaria pesada",
        description=(
            "Vacante para operador de maquinaria pesada en patio de maniobras: carga, "
            "descarga y movimiento de contenedores."
        ),
        city="Silao", state="Guanajuato", salary_min=12500, salary_max=16500, positions=3,
        requirements=[
            ("HEAVY_HM_01", None, "Experiencia real con maquinaria", "MANDATORY", 3, 30),
            ("HEAVY_HM_03", None, "Seguridad y EPP", "MANDATORY", 3, 25),
            ("HEAVY_SM_07", None, "Criterio bajo presión", "MANDATORY", 2, 20),
            (None, "FORKLIFT_CERTIFICATION", "Certificación vigente de operador", "DESIRABLE", 2, 25),
        ],
    ),
    dict(
        family="WAREHOUSE_SUPERVISOR",
        title="Encargado de almacén",
        description=(
            "Responsable de la operación diaria del almacén central: recepción, "
            "resguardo, despacho y coordinación del equipo de montacarguistas."
        ),
        city="León", state="Guanajuato", salary_min=13000, salary_max=17500, positions=1,
        requirements=[
            ("WAREHOUSE_HE_01", None, "Control de inventario", "MANDATORY", 3, 30),
            ("WAREHOUSE_HE_07", None, "Seguridad y control de riesgos", "MANDATORY", 3, 25),
            ("WAREHOUSE_SA_07", None, "Integridad ante un incidente", "MANDATORY", 2, 20),
            (None, "SAP_WMS", "Experiencia con SAP WMS", "DESIRABLE", 2, 25),
        ],
    ),
]


def _seed_company(db: Session) -> Company:
    user, created = _get_or_create_user(db, email="empresa@demo.mx", role="COMPANY")
    company = companies_service.get_company_by_user_id(db, user_id=user.id)
    if created or not company.legal_name:
        companies_service.apply_patch(
            db,
            company,
            CompanyPatch(
                legal_name="Logística del Bajío S.A. de C.V.",
                trade_name="Logística del Bajío",
                industry="Logística y transporte",
                size="51-200",
                location=CompanyLocation(city="León", state="Guanajuato"),
                work_mode="ONSITE",
                description=(
                    "Operador logístico regional del Bajío: almacenaje, distribución y "
                    "manejo de flotillas para clientes industriales."
                ),
            ),
        )
        company.verification_status = "VERIFIED"
        db.add(company)
        db.commit()
        db.refresh(company)
    return company


def _seed_vacancy(db: Session, company: Company, spec: dict) -> Vacancy:
    family = db.execute(select(JobFamily).where(JobFamily.code == spec["family"])).scalar_one()
    existing = db.execute(
        select(Vacancy).where(Vacancy.company_id == company.id, Vacancy.title == spec["title"])
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    vacancy = vacancies_service.create_vacancy(
        db,
        company_id=company.id,
        payload=VacancyInput(
            job_family_id=family.id,
            title=spec["title"],
            description=spec["description"],
            location=VacancyLocation(city=spec["city"], state=spec["state"]),
            work_mode="ONSITE",
            salary_min=spec["salary_min"],
            salary_max=spec["salary_max"],
            positions_count=spec["positions"],
        ),
    )
    requirements = [
        RequirementInput(competency_code=c, skill_code=s, label=label, kind=kind, min_level=level, weight=weight)
        for (c, s, label, kind, level, weight) in spec["requirements"]
    ]
    vacancies_service.set_requirements(db, vacancy, requirements)
    vacancies_service.apply_patch(db, vacancy, VacancyPatch(status="OPEN"))
    return vacancy


def _seed_match_run(db: Session, vacancy: Vacancy) -> None:
    existing = db.execute(select(MatchRun.id).where(MatchRun.vacancy_id == vacancy.id)).first()
    if existing is not None:
        logger.info("demo_match_run_already_exists", vacancy=vacancy.title)
        return

    match_run = matching_service.run_match(db, vacancy_id=vacancy.id)
    # Calienta `explanation_text` de los primeros resultados para que la demo
    # no dependa de una llamada a IA en vivo al abrir el detalle
    # (`AI_ADAPTER` sigue siendo `deterministic` por defecto -> costo cero).
    results, _total = matching_service.list_results(db, match_run_id=match_run.id, limit=3, offset=0)
    for result in results:
        marketplace_service.ensure_explanation(db, result)
    logger.info("demo_match_run_seeded", vacancy=vacancy.title, run_id=str(match_run.id), candidates=len(results))


# ---------------------------------------------------------------------------
# Usuarios demo adicionales (candidato@demo.mx: perfil nuevo en DRAFT)
# ---------------------------------------------------------------------------


def _seed_fresh_candidate(db: Session) -> None:
    _get_or_create_user(db, email="candidato@demo.mx", role="CANDIDATE")


def main() -> None:
    db = SessionLocal()
    try:
        print("=== Seed de demo (B13) ===")

        print("-- Candidato nuevo (golden path en vivo) --")
        _seed_fresh_candidate(db)

        print("-- Empresa demo + 3 vacantes --")
        company = _seed_company(db)
        vacancies_by_family: dict[str, Vacancy] = {}
        for spec in VACANCY_SPECS:
            vacancy = _seed_vacancy(db, company, spec)
            vacancies_by_family[spec["family"]] = vacancy
            print(f"   vacante {spec['family']}: {vacancy.title} ({vacancy.status})")

        print("-- 15 candidatos EVALUATED (5 por familia) --")
        for i, spec in enumerate(CANDIDATE_SPECS, start=1):
            print(f"   [{i}/15] {spec['full_name']} ({spec['family']}, rank={spec['rank']})")
            _seed_candidate(db, spec)

        print("-- Match runs por vacante --")
        for family_code, vacancy in vacancies_by_family.items():
            _seed_match_run(db, vacancy)
            print(f"   match run listo para {family_code}")

        print("=== Seed de demo completo ===")
    finally:
        db.close()


if __name__ == "__main__":
    main()
