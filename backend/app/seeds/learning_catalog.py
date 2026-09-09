"""Catálogo de capacitación (A4), copiado de `frontend/src/api/mock/seed/learningCatalog.ts`
para que ambos lados del contrato ofrezcan las mismas recomendaciones por competencia.
"""

from __future__ import annotations

from typing import TypedDict


class LearningCatalogSeed(TypedDict):
    competency_code: str
    type: str  # COURSE | CERTIFICATION
    provider: str
    title: str
    estimated_effort: str
    source: str  # CATALOG | WEB
    url: str | None


LEARNING_CATALOG: list[LearningCatalogSeed] = [
    {"competency_code": "OFFICE_TOOLS", "type": "COURSE", "provider": "Platzi", "title": "Curso de Excel para oficina", "estimated_effort": "6 h", "source": "CATALOG", "url": None},
    {"competency_code": "DOCUMENT_CONTROL", "type": "CERTIFICATION", "provider": "CONOCER", "title": "Estándar de competencia en control documental", "estimated_effort": "3 semanas", "source": "CATALOG", "url": None},
    {"competency_code": "SCHEDULING_COORDINATION", "type": "COURSE", "provider": "Coursera", "title": "Gestión del tiempo y agenda ejecutiva", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
    {"competency_code": "CUSTOMER_SERVICE", "type": "COURSE", "provider": "Google", "title": "Fundamentos de atención al cliente", "estimated_effort": "8 h", "source": "CATALOG", "url": None},
    {"competency_code": "WRITTEN_COMMUNICATION", "type": "COURSE", "provider": "edX", "title": "Redacción efectiva en el trabajo", "estimated_effort": "5 h", "source": "CATALOG", "url": None},
    {"competency_code": "ORGANIZATION_PRIORITIZATION", "type": "COURSE", "provider": "Platzi", "title": "Productividad personal y priorización", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
    {"competency_code": "PROBLEM_SOLVING", "type": "COURSE", "provider": "Coursera", "title": "Resolución de problemas en el trabajo", "estimated_effort": "6 h", "source": "CATALOG", "url": None},
    {"competency_code": "MACHINERY_OPERATION", "type": "CERTIFICATION", "provider": "STPS", "title": "Constancia DC-3 de operación de maquinaria", "estimated_effort": "1 semana", "source": "CATALOG", "url": None},
    {"competency_code": "SAFETY_PROTOCOLS", "type": "CERTIFICATION", "provider": "STPS", "title": "NOM-STPS de seguridad en obra", "estimated_effort": "2 semanas", "source": "CATALOG", "url": None},
    {"competency_code": "PREVENTIVE_MAINTENANCE", "type": "COURSE", "provider": "edX", "title": "Mantenimiento preventivo básico de equipo pesado", "estimated_effort": "6 h", "source": "CATALOG", "url": None},
    {"competency_code": "LOAD_HANDLING", "type": "CERTIFICATION", "provider": "CONOCER", "title": "Estándar de manejo seguro de cargas", "estimated_effort": "2 semanas", "source": "CATALOG", "url": None},
    {"competency_code": "SITE_SIGNALING", "type": "COURSE", "provider": "STPS", "title": "Señalización y comunicación en obra", "estimated_effort": "3 h", "source": "CATALOG", "url": None},
    {"competency_code": "RISK_AWARENESS", "type": "COURSE", "provider": "STPS", "title": "Identificación de riesgos laborales", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
    {"competency_code": "INVENTORY_CONTROL", "type": "COURSE", "provider": "Coursera", "title": "Fundamentos de control de inventarios", "estimated_effort": "7 h", "source": "CATALOG", "url": None},
    {"competency_code": "FORKLIFT_SAFETY", "type": "CERTIFICATION", "provider": "STPS", "title": "Certificación de montacarguista", "estimated_effort": "1 semana", "source": "CATALOG", "url": None},
    {"competency_code": "WMS_ERP_SYSTEMS", "type": "COURSE", "provider": "Platzi", "title": "Introducción a sistemas WMS", "estimated_effort": "5 h", "source": "CATALOG", "url": None},
    {"competency_code": "RECEIVING_DISPATCH", "type": "COURSE", "provider": "Coursera", "title": "Operaciones de recepción y despacho", "estimated_effort": "6 h", "source": "CATALOG", "url": None},
    {"competency_code": "STORAGE_ORGANIZATION", "type": "COURSE", "provider": "edX", "title": "Diseño de almacenes eficientes", "estimated_effort": "5 h", "source": "CATALOG", "url": None},
    {"competency_code": "TEAM_COORDINATION", "type": "COURSE", "provider": "Google", "title": "Coordinación de equipos operativos", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
    {"competency_code": "DISCREPANCY_RESOLUTION", "type": "COURSE", "provider": "Coursera", "title": "Conciliación de inventarios y diferencias", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
]
