"""Datos semilla de catálogo: familias, competencias y skills.

Realineado a `docs/Master_Prompt_Conecta_Empleo_Entrevistas_IA.md` y a
`docs/build/06_INTERVIEW_SYSTEM.md` (normativo): **3 familias × 14
competencias = 42**, una por pregunta base del banco de entrevista
(`app/seeds/interview_bank/*.json`). Reemplaza la semilla anterior de 24
(8 por familia).

El `code` de cada competencia replica el id de su pregunta para que la
trazabilidad pregunta → competencia → rúbrica sea directa y estable:
`ADMIN_HA_01` ↔ pregunta `HA-01`, `WAREHOUSE_SE_07` ↔ pregunta `SE-07`, etc.
Las 7 dimensiones soft (`*_SA_*` / `*_SE_*` / `*_SM_*`) son conceptualmente
comunes a las tres familias (master prompt §8: responsabilidad, organización
y priorización, comunicación, trabajo en equipo, resolución de problemas,
adaptabilidad, criterio/integridad/seguridad), con `name`/`description`
adaptados al contexto de cada puesto.

`is_core = true` como mínimo en las competencias de seguridad/integridad y en
las técnicas centrales del puesto (criterio de docs/build/06 §1).
"""

from __future__ import annotations

from typing import TypedDict


class FamilySeed(TypedDict):
    code: str
    name: str
    role_objective: str


class CompetencySeed(TypedDict):
    code: str
    name: str
    type: str  # TECHNICAL | BEHAVIORAL
    is_core: bool
    description: str


FAMILIES: list[FamilySeed] = [
    {
        "code": "ADMIN_ASSISTANT",
        "name": "Auxiliar administrativo",
        "role_objective": (
            "Apoyar actividades administrativas y operativas, asegurando manejo correcto de "
            "información, documentos, registros y seguimiento de actividades."
        ),
    },
    {
        "code": "HEAVY_MACHINERY_OPERATOR",
        "name": "Obrero operador de maquinaria pesada",
        "role_objective": (
            "Operar maquinaria pesada de forma segura y eficiente en construcción u "
            "operaciones relacionadas."
        ),
    },
    {
        "code": "WAREHOUSE_SUPERVISOR",
        "name": "Encargado de almacén",
        "role_objective": (
            "Administrar y controlar entradas, salidas, almacenamiento e inventario de "
            "mercancías, procurando orden, disponibilidad y buen estado de los productos."
        ),
    },
]

# ---------------------------------------------------------------------------
# ADMIN_ASSISTANT — HA-01..07 (hard) + SA-01..07 (soft). Master prompt §14.
# ---------------------------------------------------------------------------
_ADMIN_ASSISTANT: list[CompetencySeed] = [
    {
        "code": "ADMIN_HA_01",
        "name": "Excel y hojas de cálculo",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Usa fórmulas, filtros, tablas y verificación de resultados en Excel u hojas de cálculo equivalentes para tareas administrativas reales.",
    },
    {
        "code": "ADMIN_HA_02",
        "name": "Captura y calidad de información",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Valida, corrige y da trazabilidad a datos antes de capturarlos, sin inventar valores ni omitir la duda a quien corresponda.",
    },
    {
        "code": "ADMIN_HA_03",
        "name": "Gestión documental",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Organiza documentos físicos y digitales con nomenclatura, clasificación, control de versiones y respaldo que reducen el riesgo de pérdida de información.",
    },
    {
        "code": "ADMIN_HA_04",
        "name": "Reportes administrativos",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Reúne información de varias fuentes, la valida y la presenta en un reporte claro y con control de errores.",
    },
    {
        "code": "ADMIN_HA_05",
        "name": "Seguimiento de pendientes",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Registra solicitudes con fecha límite y responsable, y da seguimiento activo para que ninguna quede sin atender.",
    },
    {
        "code": "ADMIN_HA_06",
        "name": "Sistemas y bases de datos administrativas",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Navega sistemas administrativos o bases de datos con controles de calidad, y aprende herramientas nuevas sin poner en riesgo la información.",
    },
    {
        "code": "ADMIN_HA_07",
        "name": "Facturas y documentos administrativos",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Revisa campos de facturas, recibos u órdenes de compra contra el registro interno y escala discrepancias sin modificar datos sin autorización.",
    },
    {
        "code": "ADMIN_SA_01",
        "name": "Organización y priorización",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Decide qué pendiente atender primero cuando hay varios simultáneos, con un criterio explícito de urgencia e impacto.",
    },
    {
        "code": "ADMIN_SA_02",
        "name": "Atención al detalle y responsabilidad",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Detecta errores en documentos o registros antes de que generen un problema, y actúa sobre ellos sin que se lo pidan.",
    },
    {
        "code": "ADMIN_SA_03",
        "name": "Comunicación",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Comunica con claridad a un compañero o cliente cuando no tiene toda la información todavía, sin dejarlo sin respuesta.",
    },
    {
        "code": "ADMIN_SA_04",
        "name": "Trabajo en equipo",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Se coordina con otra persona de quien depende para terminar una tarea, dando seguimiento activo a esa dependencia.",
    },
    {
        "code": "ADMIN_SA_05",
        "name": "Resolución de problemas",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Actúa con criterio propio cuando un proceso administrativo se detiene por falta de información y el responsable no está disponible.",
    },
    {
        "code": "ADMIN_SA_06",
        "name": "Adaptabilidad",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Ajusta prioridades o forma de trabajar cuando cambian con poco tiempo de aviso, sin perder control de lo pendiente.",
    },
    {
        "code": "ADMIN_SA_07",
        "name": "Confidencialidad e integridad",
        "type": "BEHAVIORAL",
        "is_core": True,
        "description": "Protege información interna ante solicitudes informales, consulta políticas o escala la duda en vez de divulgar por criterio propio.",
    },
]

# ---------------------------------------------------------------------------
# WAREHOUSE_SUPERVISOR — HE-01..07 (hard) + SE-01..07 (soft). Master prompt §15.
# ---------------------------------------------------------------------------
_WAREHOUSE_SUPERVISOR: list[CompetencySeed] = [
    {
        "code": "WAREHOUSE_HE_01",
        "name": "Control de inventario",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Investiga y corrige diferencias entre el conteo físico y el sistema con trazabilidad, reconteo y causa raíz, no solo ajustando la cifra.",
    },
    {
        "code": "WAREHOUSE_HE_02",
        "name": "Entradas de mercancía",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Revisa cantidad, estado, documentos y SKU/lote antes de recibir y registrar formalmente mercancía entrante.",
    },
    {
        "code": "WAREHOUSE_HE_03",
        "name": "Salidas de mercancía",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Valida autorización, identificación, cantidad y registro antes de liberar una salida, dejando evidencia de la entrega.",
    },
    {
        "code": "WAREHOUSE_HE_04",
        "name": "Organización física del almacén",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Define zonas, etiquetado, rotación y accesos que facilitan localizar producto, reducir errores y mantener condiciones seguras.",
    },
    {
        "code": "WAREHOUSE_HE_05",
        "name": "Excel y sistema de almacén",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Usa Excel, un ERP o un sistema de inventarios para controlar existencias, movimientos y reportes con datos validados.",
    },
    {
        "code": "WAREHOUSE_HE_06",
        "name": "Manejo de producto dañado o con incidencia",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Segrega, documenta y comunica producto dañado o con empaque alterado hasta cerrar la incidencia con una decisión autorizada.",
    },
    {
        "code": "WAREHOUSE_HE_07",
        "name": "Seguridad y control de riesgos",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Ante una condición insegura, protege a las personas, aísla o señaliza el riesgo, comunica y sigue el protocolo antes que la operación.",
    },
    {
        "code": "WAREHOUSE_SA_01",
        "name": "Responsabilidad",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Detecta y actúa sobre un problema en su área aunque nadie se lo haya reportado.",
    },
    {
        "code": "WAREHOUSE_SA_02",
        "name": "Priorización",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Decide el orden de atención entre una recepción pendiente, una salida urgente y una diferencia de inventario por investigar.",
    },
    {
        "code": "WAREHOUSE_SA_03",
        "name": "Comunicación",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Comunica una diferencia importante de inventario al final del turno con la información necesaria para actuar sobre ella.",
    },
    {
        "code": "WAREHOUSE_SA_04",
        "name": "Trabajo en equipo",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Se coordina con compras, ventas, transporte u otra área para resolver un problema de almacén.",
    },
    {
        "code": "WAREHOUSE_SA_05",
        "name": "Resolución de problemas",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Investiga con método cuando el sistema indica existencia pero el producto no aparece en su ubicación.",
    },
    {
        "code": "WAREHOUSE_SA_06",
        "name": "Adaptabilidad",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Reorganiza el trabajo cuando cambia la prioridad de surtido por una entrega urgente, sin perder control de lo que ya estaba en proceso.",
    },
    {
        "code": "WAREHOUSE_SA_07",
        "name": "Integridad y criterio ante un incidente",
        "type": "BEHAVIORAL",
        "is_core": True,
        "description": "Ante un posible robo o manipulación indebida, prioriza su seguridad personal, preserva evidencia e informa al responsable en vez de confrontar o encubrir.",
    },
]

# ---------------------------------------------------------------------------
# HEAVY_MACHINERY_OPERATOR — HM-01..07 (hard) + SM-01..07 (soft). Master prompt §16.
# ---------------------------------------------------------------------------
_HEAVY_MACHINERY_OPERATOR: list[CompetencySeed] = [
    {
        "code": "HEAVY_HM_01",
        "name": "Experiencia real con maquinaria",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Ha operado equipos concretos, durante un tiempo y en tareas identificables, sin asumir dominio solo por conocer el nombre de la máquina.",
    },
    {
        "code": "HEAVY_HM_02",
        "name": "Inspección preoperativa",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Revisa fluidos, fugas, neumáticos/orugas, frenos, hidráulica, alarmas y mandos en un orden razonable antes de encender la máquina.",
    },
    {
        "code": "HEAVY_HM_03",
        "name": "Seguridad y EPP",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Aplica EPP, zona de exclusión, señalización y comunicación con personal en tierra como parte indispensable de operar o revisar maquinaria.",
    },
    {
        "code": "HEAVY_HM_04",
        "name": "Manejo de falla durante la operación",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Detiene la máquina en condiciones seguras ante una falla o comportamiento anormal, la asegura y reporta sin reparar fuera de su competencia.",
    },
    {
        "code": "HEAVY_HM_05",
        "name": "Fuga hidráulica",
        "type": "TECHNICAL",
        "is_core": True,
        "description": "Detiene y asegura la máquina, evita contacto y contaminación, y reporta antes de decidir si puede seguir operando ante una fuga de fluido hidráulico.",
    },
    {
        "code": "HEAVY_HM_06",
        "name": "Maniobra en espacio reducido con personal cercano",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Delimita, usa señalero, controla puntos ciegos y velocidad, y detiene la maniobra si pierde visibilidad al mover material cerca de personas.",
    },
    {
        "code": "HEAVY_HM_07",
        "name": "Condiciones adversas del terreno",
        "type": "TECHNICAL",
        "is_core": False,
        "description": "Evalúa estabilidad y riesgo de volcadura ante terreno inestable o clima adverso, y pide apoyo en vez de actuar de forma impulsiva.",
    },
    {
        "code": "HEAVY_SM_01",
        "name": "Responsabilidad y disciplina",
        "type": "BEHAVIORAL",
        "is_core": True,
        "description": "Detiene o retrasa una tarea cuando considera que no es seguro continuar, aunque eso implique un costo operativo.",
    },
    {
        "code": "HEAVY_SM_02",
        "name": "Organización y gestión del tiempo",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Organiza varias tareas con maquinaria durante un turno, incluidas las revisiones necesarias, sin omitir ninguna por prisa.",
    },
    {
        "code": "HEAVY_SM_03",
        "name": "Comunicación",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Se comunica con señalistas, supervisores y personal en tierra cuando una maniobra requiere coordinación.",
    },
    {
        "code": "HEAVY_SM_04",
        "name": "Trabajo en equipo",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Se coordina con otros operadores o personal de piso para cumplir una tarea compartida.",
    },
    {
        "code": "HEAVY_SM_05",
        "name": "Resolución de problemas",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Analiza y resuelve una situación difícil real enfrentada operando maquinaria, explicando el criterio usado.",
    },
    {
        "code": "HEAVY_SM_06",
        "name": "Adaptabilidad",
        "type": "BEHAVIORAL",
        "is_core": False,
        "description": "Ajusta su forma de trabajar cuando cambian el terreno, el clima o el plan de trabajo durante el turno.",
    },
    {
        "code": "HEAVY_SM_07",
        "name": "Criterio bajo presión",
        "type": "BEHAVIORAL",
        "is_core": True,
        "description": "Detiene o cuestiona de forma profesional una maniobra que considera insegura aunque un supervisor pida continuar, explicando el riesgo y escalando.",
    },
]

COMPETENCIES_BY_FAMILY: dict[str, list[CompetencySeed]] = {
    "ADMIN_ASSISTANT": _ADMIN_ASSISTANT,
    "HEAVY_MACHINERY_OPERATOR": _HEAVY_MACHINERY_OPERATOR,
    "WAREHOUSE_SUPERVISOR": _WAREHOUSE_SUPERVISOR,
}

# ---------- catálogo de ~40 skills (copiado de frontend/src/api/mock/seed/catalog.ts) ----------
# No forma parte del realineamiento de B2b (docs/build/06 solo pide 42 competencias/rúbricas/
# preguntas); se conserva igual para no romper `GET /skills` ni `skill_evidences` futuros.
SkillSeed = tuple[str, str, str]  # code, name, category

SKILLS: list[SkillSeed] = [
    # Ofimática / administrativo
    ("EXCEL_INTERMEDIATE", "Excel nivel intermedio", "Ofimática"),
    ("EXCEL_ADVANCED", "Excel avanzado (tablas dinámicas)", "Ofimática"),
    ("WORD_ADVANCED", "Word avanzado", "Ofimática"),
    ("OUTLOOK_MANAGEMENT", "Gestión de correo (Outlook)", "Ofimática"),
    ("DATA_ENTRY", "Captura de datos", "Ofimática"),
    ("FILING_SYSTEMS", "Sistemas de archivo", "Administración"),
    ("INVOICE_PROCESSING", "Procesamiento de facturas", "Administración"),
    ("TRAVEL_COORDINATION", "Coordinación de viajes", "Administración"),
    ("CALENDAR_MANAGEMENT", "Gestión de agenda", "Administración"),
    ("BUSINESS_WRITING", "Redacción de negocios", "Comunicación"),
    ("MINUTE_TAKING", "Elaboración de minutas", "Comunicación"),
    ("BILINGUAL_ENGLISH_BASIC", "Inglés básico", "Idiomas"),
    # Atención a clientes
    ("CUSTOMER_SERVICE_PHONE", "Atención telefónica", "Atención a clientes"),
    ("CUSTOMER_SERVICE_CHAT", "Atención por chat", "Atención a clientes"),
    ("POS_SYSTEMS", "Sistemas punto de venta", "Atención a clientes"),
    ("CONFLICT_RESOLUTION", "Resolución de conflictos", "Habilidades blandas"),
    ("TIME_MANAGEMENT", "Administración del tiempo", "Habilidades blandas"),
    ("TEAM_LEADERSHIP_BASIC", "Liderazgo de equipo (básico)", "Habilidades blandas"),
    # Maquinaria pesada
    ("FORKLIFT_OPERATION", "Operación de montacargas", "Maquinaria"),
    ("FORKLIFT_CERTIFICATION", "Certificación de montacarguista", "Maquinaria"),
    ("CRANE_OPERATION", "Operación de grúa", "Maquinaria"),
    ("EXCAVATOR_OPERATION", "Operación de retroexcavadora", "Maquinaria"),
    ("BULLDOZER_OPERATION", "Operación de bulldozer", "Maquinaria"),
    ("LOADER_OPERATION", "Operación de cargador frontal", "Maquinaria"),
    ("WELDING_BASIC", "Soldadura básica", "Maquinaria"),
    ("HYDRAULIC_SYSTEMS", "Sistemas hidráulicos", "Maquinaria"),
    ("PREVENTIVE_MAINTENANCE_BASIC", "Mantenimiento preventivo básico", "Mantenimiento"),
    # Seguridad
    ("LOCKOUT_TAGOUT", "Bloqueo y etiquetado (LOTO)", "Seguridad"),
    ("PPE_USAGE", "Uso de equipo de protección personal", "Seguridad"),
    ("TRAFFIC_SIGNALING", "Señalización vial en obra", "Seguridad"),
    ("SAFETY_AUDITS", "Auditorías de seguridad", "Seguridad"),
    ("FIRST_AID_BASIC", "Primeros auxilios básicos", "Seguridad"),
    ("DEFENSIVE_DRIVING", "Manejo defensivo", "Seguridad"),
    # Almacén / logística
    ("SAP_WMS", "SAP WMS", "Sistemas"),
    ("ORACLE_WMS", "Oracle WMS", "Sistemas"),
    ("INVENTORY_CYCLE_COUNT", "Conteos cíclicos de inventario", "Logística"),
    ("PALLET_JACK", "Operación de patín hidráulico", "Logística"),
    ("BARCODE_SCANNING", "Escaneo de códigos de barras", "Logística"),
    ("RECEIVING_INSPECTION", "Inspección de recepción", "Logística"),
    ("DISPATCH_PLANNING", "Planeación de despachos", "Logística"),
    ("WAREHOUSE_LAYOUT", "Diseño de layout de almacén", "Logística"),
]
