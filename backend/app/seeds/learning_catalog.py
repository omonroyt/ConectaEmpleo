"""Catálogo de capacitación (A4), copiado de `frontend/src/api/mock/seed/learningCatalog.ts`
para que ambos lados del contrato ofrezcan las mismas recomendaciones por competencia.

`competency_code` remapeado en B2b (realineamiento al master prompt, ver
`docs/build/06_INTERVIEW_SYSTEM.md`) a los 42 códigos nuevos de
`app/seeds/families.py`; los códigos viejos (`OFFICE_TOOLS`,
`INVENTORY_CONTROL`, etc.) ya no existen como competencias. No es una tabla
con llave foránea (`competency_code` es un string libre), así que no había
riesgo de romper una constraint, pero dejarla apuntando a códigos muertos
haría que `GET /candidates/me/learning-path` (A4) nunca encontrara
recomendaciones — de ahí el remapeo 1:1 a la competencia nueva más cercana en
significado.
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
    # Auxiliar administrativo
    {"competency_code": "ADMIN_HA_01", "type": "COURSE", "provider": "Platzi", "title": "Curso de Excel para oficina", "estimated_effort": "6 h", "source": "CATALOG", "url": None},
    {"competency_code": "ADMIN_HA_03", "type": "CERTIFICATION", "provider": "CONOCER", "title": "Estándar de competencia en control documental", "estimated_effort": "3 semanas", "source": "CATALOG", "url": None},
    {"competency_code": "ADMIN_HA_05", "type": "COURSE", "provider": "Coursera", "title": "Gestión del tiempo y seguimiento de pendientes", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
    {"competency_code": "ADMIN_SA_03", "type": "COURSE", "provider": "Google", "title": "Fundamentos de atención al cliente", "estimated_effort": "8 h", "source": "CATALOG", "url": None},
    {"competency_code": "ADMIN_HA_04", "type": "COURSE", "provider": "edX", "title": "Redacción efectiva de reportes en el trabajo", "estimated_effort": "5 h", "source": "CATALOG", "url": None},
    {"competency_code": "ADMIN_SA_01", "type": "COURSE", "provider": "Platzi", "title": "Productividad personal y priorización", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
    {"competency_code": "ADMIN_SA_05", "type": "COURSE", "provider": "Coursera", "title": "Resolución de problemas en el trabajo", "estimated_effort": "6 h", "source": "CATALOG", "url": None},
    # Operador de maquinaria pesada
    {"competency_code": "HEAVY_HM_01", "type": "CERTIFICATION", "provider": "STPS", "title": "Constancia DC-3 de operación de maquinaria", "estimated_effort": "1 semana", "source": "CATALOG", "url": None},
    {"competency_code": "HEAVY_HM_03", "type": "CERTIFICATION", "provider": "STPS", "title": "NOM-STPS de seguridad en obra", "estimated_effort": "2 semanas", "source": "CATALOG", "url": None},
    {"competency_code": "HEAVY_HM_02", "type": "COURSE", "provider": "edX", "title": "Inspección preoperativa y mantenimiento preventivo básico", "estimated_effort": "6 h", "source": "CATALOG", "url": None},
    {"competency_code": "HEAVY_HM_06", "type": "CERTIFICATION", "provider": "CONOCER", "title": "Estándar de manejo seguro de cargas", "estimated_effort": "2 semanas", "source": "CATALOG", "url": None},
    {"competency_code": "HEAVY_HM_03", "type": "COURSE", "provider": "STPS", "title": "Señalización y comunicación en obra", "estimated_effort": "3 h", "source": "CATALOG", "url": None},
    {"competency_code": "HEAVY_HM_05", "type": "COURSE", "provider": "STPS", "title": "Identificación de riesgos laborales", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
    # Encargado de almacén
    {"competency_code": "WAREHOUSE_HE_01", "type": "COURSE", "provider": "Coursera", "title": "Fundamentos de control de inventarios", "estimated_effort": "7 h", "source": "CATALOG", "url": None},
    {"competency_code": "WAREHOUSE_HE_07", "type": "CERTIFICATION", "provider": "STPS", "title": "Certificación de montacarguista", "estimated_effort": "1 semana", "source": "CATALOG", "url": None},
    {"competency_code": "WAREHOUSE_HE_05", "type": "COURSE", "provider": "Platzi", "title": "Introducción a sistemas WMS", "estimated_effort": "5 h", "source": "CATALOG", "url": None},
    {"competency_code": "WAREHOUSE_HE_02", "type": "COURSE", "provider": "Coursera", "title": "Operaciones de recepción y despacho", "estimated_effort": "6 h", "source": "CATALOG", "url": None},
    {"competency_code": "WAREHOUSE_HE_04", "type": "COURSE", "provider": "edX", "title": "Diseño de almacenes eficientes", "estimated_effort": "5 h", "source": "CATALOG", "url": None},
    {"competency_code": "WAREHOUSE_SA_04", "type": "COURSE", "provider": "Google", "title": "Coordinación de equipos operativos", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
    {"competency_code": "WAREHOUSE_SA_05", "type": "COURSE", "provider": "Coursera", "title": "Conciliación de inventarios y diferencias", "estimated_effort": "4 h", "source": "CATALOG", "url": None},
]
