"""Seed idempotente de catálogo: familias, competencias, skills, rúbricas y
catálogo de aprendizaje.

Uso: `python -m app.seeds.run` (con `DATABASE_URL` apuntando a la base
correcta). Correrlo dos veces no duplica nada: cada entidad se busca por su
clave natural (código) antes de insertar; si ya existe, se actualiza en el
lugar en vez de crear una fila nueva.
"""

from __future__ import annotations

import json
from pathlib import Path

import structlog
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.modules.catalog.models import Competency, JobFamily, LearningCatalogEntry, Rubric, Skill
from app.seeds.families import COMPETENCIES_BY_FAMILY, FAMILIES, SKILLS
from app.seeds.learning_catalog import LEARNING_CATALOG

logger = structlog.get_logger("seeds")

RUBRICS_DIR = Path(__file__).parent / "rubrics"


def _upsert_job_family(db: Session, code: str, name: str, role_objective: str) -> JobFamily:
    family = db.query(JobFamily).filter(JobFamily.code == code).one_or_none()
    if family is None:
        family = JobFamily(code=code, name=name, role_objective=role_objective)
        db.add(family)
        db.flush()
        logger.info("job_family_created", code=code)
    else:
        family.name = name
        family.role_objective = role_objective
    return family


def _upsert_competency(
    db: Session, *, job_family_id, code: str, name: str, type_: str, is_core: bool, description: str
) -> Competency:
    competency = (
        db.query(Competency)
        .filter(Competency.job_family_id == job_family_id, Competency.code == code)
        .one_or_none()
    )
    if competency is None:
        competency = Competency(
            job_family_id=job_family_id,
            code=code,
            name=name,
            type=type_,
            is_core=is_core,
            description=description,
        )
        db.add(competency)
        db.flush()
        logger.info("competency_created", code=code, job_family_id=str(job_family_id))
    else:
        competency.name = name
        competency.type = type_
        competency.is_core = is_core
        competency.description = description
    return competency


def _upsert_skill(db: Session, code: str, name: str, category: str) -> Skill:
    skill = db.query(Skill).filter(Skill.code == code).one_or_none()
    if skill is None:
        skill = Skill(code=code, name=name, category=category)
        db.add(skill)
        db.flush()
        logger.info("skill_created", code=code)
    else:
        skill.name = name
        skill.category = category
    return skill


def _upsert_rubric(db: Session, *, competency_id, version: int, levels: list, evidence_guidelines: dict) -> Rubric:
    rubric = (
        db.query(Rubric)
        .filter(Rubric.competency_id == competency_id, Rubric.version == version)
        .one_or_none()
    )
    if rubric is None:
        rubric = Rubric(
            competency_id=competency_id,
            version=version,
            levels=levels,
            evidence_guidelines=evidence_guidelines,
            is_active=True,
        )
        db.add(rubric)
        db.flush()
        logger.info("rubric_created", competency_id=str(competency_id), version=version)
    else:
        rubric.levels = levels
        rubric.evidence_guidelines = evidence_guidelines
        rubric.is_active = True
    return rubric


def _upsert_learning_entry(
    db: Session, *, competency_code: str, type_: str, provider: str, title: str,
    estimated_effort: str, source: str, url: str | None,
) -> LearningCatalogEntry:
    entry = (
        db.query(LearningCatalogEntry)
        .filter(LearningCatalogEntry.competency_code == competency_code, LearningCatalogEntry.title == title)
        .one_or_none()
    )
    if entry is None:
        entry = LearningCatalogEntry(
            competency_code=competency_code,
            type=type_,
            provider=provider,
            title=title,
            estimated_effort=estimated_effort,
            source=source,
            url=url,
        )
        db.add(entry)
        db.flush()
        logger.info("learning_entry_created", competency_code=competency_code, title=title)
    else:
        entry.type = type_
        entry.provider = provider
        entry.estimated_effort = estimated_effort
        entry.source = source
        entry.url = url
    return entry


def _load_rubric_file(job_family_code: str) -> list[dict]:
    filename = {
        "ADMIN_ASSISTANT": "admin_assistant.json",
        "HEAVY_MACHINERY_OPERATOR": "heavy_machinery_operator.json",
        "WAREHOUSE_SUPERVISOR": "warehouse_supervisor.json",
    }[job_family_code]
    with open(RUBRICS_DIR / filename, encoding="utf-8") as fh:
        return json.load(fh)


def run() -> None:
    db = SessionLocal()
    try:
        families_by_code: dict[str, JobFamily] = {}
        for family_data in FAMILIES:
            family = _upsert_job_family(
                db, code=family_data["code"], name=family_data["name"],
                role_objective=family_data["role_objective"],
            )
            families_by_code[family_data["code"]] = family
        db.flush()

        competencies_by_family_and_code: dict[tuple[str, str], Competency] = {}
        for family_code, competencies in COMPETENCIES_BY_FAMILY.items():
            family = families_by_code[family_code]
            for comp_data in competencies:
                competency = _upsert_competency(
                    db,
                    job_family_id=family.id,
                    code=comp_data["code"],
                    name=comp_data["name"],
                    type_=comp_data["type"],
                    is_core=comp_data["is_core"],
                    description=comp_data["description"],
                )
                competencies_by_family_and_code[(family_code, comp_data["code"])] = competency
        db.flush()

        for skill_code, skill_name, category in SKILLS:
            _upsert_skill(db, skill_code, skill_name, category)

        for family_code in COMPETENCIES_BY_FAMILY:
            rubric_rows = _load_rubric_file(family_code)
            for row in rubric_rows:
                competency = competencies_by_family_and_code[(family_code, row["competency_code"])]
                evidence_guidelines = {
                    "what_to_probe": row["what_to_probe"],
                    "positive_signals": row["positive_signals"],
                    "negative_signals": row["negative_signals"],
                    "score_mapping": row["score_mapping"],
                }
                _upsert_rubric(
                    db,
                    competency_id=competency.id,
                    version=row["version"],
                    levels=row["levels"],
                    evidence_guidelines=evidence_guidelines,
                )

        for entry in LEARNING_CATALOG:
            _upsert_learning_entry(
                db,
                competency_code=entry["competency_code"],
                type_=entry["type"],
                provider=entry["provider"],
                title=entry["title"],
                estimated_effort=entry["estimated_effort"],
                source=entry["source"],
                url=entry["url"],
            )

        db.commit()
        logger.info("seeds_completed")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
