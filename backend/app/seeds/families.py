"""Datos semilla de catálogo: familias, competencias y skills.

Códigos, nombres, tipos y `is_core` copiados literalmente de
`docs/build/02_API_CONTRACT.md` §2 y verificados contra
`frontend/src/api/mock/seed/catalog.ts` para que ambos lados del contrato
compartan exactamente los mismos datos semilla.
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
            "Dar soporte operativo a una oficina o coordinación: agenda, documentos, "
            "atención a clientes y proveedores."
        ),
    },
    {
        "code": "HEAVY_MACHINERY_OPERATOR",
        "name": "Obrero operador de maquinaria pesada",
        "role_objective": (
            "Operar maquinaria pesada en obra o planta cumpliendo protocolos de "
            "seguridad y ritmos de producción."
        ),
    },
    {
        "code": "WAREHOUSE_SUPERVISOR",
        "name": "Encargado de almacén",
        "role_objective": (
            "Coordinar la recepción, resguardo y despacho de inventario, y al "
            "equipo de montacarguistas y auxiliares."
        ),
    },
]

COMPETENCIES_BY_FAMILY: dict[str, list[CompetencySeed]] = {
    "ADMIN_ASSISTANT": [
        {"code": "OFFICE_TOOLS", "name": "Herramientas de oficina (Excel, Word, correo)", "type": "TECHNICAL", "is_core": True, "description": "Usa hojas de cálculo, procesador de texto y correo para tareas diarias de oficina."},
        {"code": "DOCUMENT_CONTROL", "name": "Control documental y archivo", "type": "TECHNICAL", "is_core": True, "description": "Organiza, clasifica y resguarda documentos físicos y digitales de forma trazable."},
        {"code": "SCHEDULING_COORDINATION", "name": "Agenda y coordinación", "type": "TECHNICAL", "is_core": False, "description": "Coordina citas, salas y viajes evitando choques de horario."},
        {"code": "CUSTOMER_SERVICE", "name": "Atención a clientes y proveedores", "type": "TECHNICAL", "is_core": True, "description": "Atiende solicitudes de clientes o proveedores con cortesía y seguimiento oportuno."},
        {"code": "WRITTEN_COMMUNICATION", "name": "Comunicación escrita", "type": "TECHNICAL", "is_core": False, "description": "Redacta correos, minutas y reportes claros y sin ambigüedad."},
        {"code": "ORGANIZATION_PRIORITIZATION", "name": "Organización y priorización", "type": "BEHAVIORAL", "is_core": True, "description": "Ordena tareas por urgencia e importancia y cumple fechas límite."},
        {"code": "TEAM_COLLABORATION", "name": "Colaboración en equipo", "type": "BEHAVIORAL", "is_core": False, "description": "Coopera con otras áreas para sacar adelante tareas compartidas."},
        {"code": "PROBLEM_SOLVING", "name": "Resolución de problemas", "type": "BEHAVIORAL", "is_core": False, "description": "Identifica la causa de un contratiempo administrativo y propone una solución práctica."},
    ],
    "HEAVY_MACHINERY_OPERATOR": [
        {"code": "MACHINERY_OPERATION", "name": "Operación de maquinaria", "type": "TECHNICAL", "is_core": True, "description": "Opera maquinaria pesada (retroexcavadora, cargador, grúa) con precisión y control."},
        {"code": "SAFETY_PROTOCOLS", "name": "Protocolos de seguridad", "type": "TECHNICAL", "is_core": True, "description": "Aplica protocolos de seguridad, bloqueo/etiquetado y uso de EPP en todo momento."},
        {"code": "PREVENTIVE_MAINTENANCE", "name": "Mantenimiento preventivo", "type": "TECHNICAL", "is_core": False, "description": "Revisa niveles, filtros y desgaste antes de operar para prevenir fallas."},
        {"code": "LOAD_HANDLING", "name": "Manejo de cargas", "type": "TECHNICAL", "is_core": True, "description": "Calcula y maniobra cargas pesadas respetando límites de peso y equilibrio."},
        {"code": "SITE_SIGNALING", "name": "Señalización y comunicación en obra", "type": "TECHNICAL", "is_core": False, "description": "Usa señales manuales y radio para coordinarse con el equipo en obra."},
        {"code": "RISK_AWARENESS", "name": "Conciencia de riesgo", "type": "BEHAVIORAL", "is_core": True, "description": "Detecta condiciones inseguras y actúa antes de que ocurra un incidente."},
        {"code": "INSTRUCTION_FOLLOWING", "name": "Seguimiento de instrucciones", "type": "BEHAVIORAL", "is_core": False, "description": "Ejecuta instrucciones del supervisor de obra con precisión y sin omitir pasos."},
        {"code": "TEAM_COORDINATION", "name": "Coordinación con el equipo", "type": "BEHAVIORAL", "is_core": False, "description": "Se coordina con maniobristas y otros operadores para trabajar sin choques ni tiempos muertos."},
    ],
    "WAREHOUSE_SUPERVISOR": [
        {"code": "INVENTORY_CONTROL", "name": "Control de inventarios", "type": "TECHNICAL", "is_core": True, "description": "Mantiene el inventario físico conciliado contra el sistema y detecta variaciones."},
        {"code": "FORKLIFT_SAFETY", "name": "Seguridad en montacargas", "type": "TECHNICAL", "is_core": True, "description": "Opera montacargas siguiendo reglas de velocidad, carga y señalización del almacén."},
        {"code": "WMS_ERP_SYSTEMS", "name": "Sistemas WMS / ERP", "type": "TECHNICAL", "is_core": False, "description": "Registra movimientos de almacén en un sistema WMS o ERP con datos correctos."},
        {"code": "RECEIVING_DISPATCH", "name": "Recepción y despacho", "type": "TECHNICAL", "is_core": True, "description": "Verifica y documenta la mercancía que entra y sale del almacén contra el pedido."},
        {"code": "STORAGE_ORGANIZATION", "name": "Organización de almacén", "type": "TECHNICAL", "is_core": False, "description": "Define y mantiene la ubicación lógica de la mercancía para agilizar el surtido."},
        {"code": "TEAM_COORDINATION", "name": "Coordinación de equipo", "type": "BEHAVIORAL", "is_core": True, "description": "Distribuye tareas entre montacarguistas y auxiliares durante el turno."},
        {"code": "PROBLEM_SOLVING", "name": "Resolución de problemas", "type": "BEHAVIORAL", "is_core": False, "description": "Reacciona con criterio ante faltantes, retrasos o mercancía dañada."},
        {"code": "DISCREPANCY_RESOLUTION", "name": "Resolución de diferencias", "type": "BEHAVIORAL", "is_core": False, "description": "Investiga y concilia diferencias entre el físico y el sistema hasta cerrarlas."},
    ],
}

# ---------- catálogo de ~40 skills (copiado de frontend/src/api/mock/seed/catalog.ts) ----------
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
