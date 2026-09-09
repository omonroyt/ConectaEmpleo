"""Invariante I-05 (docs/04 §6.3, §8): `CandidateSnapshotForAI` nunca lleva
`full_name`, `photo_url`, `birth_date` ni `gender` — ni en la clase, ni en su
serialización, sin importar qué tan lleno esté el perfil de origen.
"""

from __future__ import annotations

import json
import uuid

from app.ai.contracts.base import CandidateSnapshotForAI
from app.modules.candidates.models import CandidateProfile
from app.modules.candidates.service import build_candidate_snapshot_for_ai

FORBIDDEN_KEYS = {"full_name", "photo_url", "birth_date", "gender"}


def _fully_populated_profile() -> CandidateProfile:
    return CandidateProfile(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        full_name="Nombre Completo Sensible",
        phone="5512345678",
        photo_url="https://example.com/photo-sensible.jpg",
        birth_date=__import__("datetime").date(1990, 1, 1),
        gender="F",
        job_family_id=None,
        location_city="León",
        location_state="Guanajuato",
        availability="IMMEDIATE",
        salary_expectation_min=8000,
        salary_expectation_max=12000,
        education=[{"id": "e1", "institution": "Tec", "degree": "Bachillerato", "start_year": 2005, "end_year": 2008}],
        experience=[
            {
                "id": "x1",
                "company": "Almacenes del Bajío",
                "position": "Auxiliar",
                "start_date": "2020-01-01",
                "end_date": None,
                "is_current": True,
                "description": "Control de inventario",
                "skills": ["INVENTORY_CONTROL"],
            }
        ],
        bio="Bio con información profesional.",
        status="DRAFT",
        anon_code="CND-TEST",
    )


def test_candidate_snapshot_class_does_not_declare_forbidden_fields() -> None:
    declared_fields = set(CandidateSnapshotForAI.model_fields.keys())
    assert declared_fields.isdisjoint(FORBIDDEN_KEYS), (
        f"CandidateSnapshotForAI declara campos prohibidos: {declared_fields & FORBIDDEN_KEYS}"
    )


def test_candidate_snapshot_serialization_never_leaks_forbidden_keys() -> None:
    profile = _fully_populated_profile()
    snapshot = build_candidate_snapshot_for_ai(profile)

    as_json = snapshot.model_dump_json()
    parsed = json.loads(as_json)

    def _all_keys(node: object) -> set[str]:
        keys: set[str] = set()
        if isinstance(node, dict):
            for key, value in node.items():
                keys.add(key)
                keys |= _all_keys(value)
        elif isinstance(node, list):
            for item in node:
                keys |= _all_keys(item)
        return keys

    all_keys = _all_keys(parsed)
    assert all_keys.isdisjoint(FORBIDDEN_KEYS), f"Claves prohibidas encontradas: {all_keys & FORBIDDEN_KEYS}"

    # También a nivel de texto crudo, por si un valor (no una clave) reprodujera el nombre del campo.
    for forbidden in FORBIDDEN_KEYS:
        assert f'"{forbidden}"' not in as_json
