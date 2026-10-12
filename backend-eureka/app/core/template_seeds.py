"""
Plantillas globales predefinidas del sistema Eureka SST.
Se insertan con el script: python scripts/seed_templates.py

Cada plantilla tiene:
- name, description, category
- structure_type
- suggested_periodicity
- fields_schema: lista de campos con scope (general | matriz)
"""

GLOBAL_TEMPLATES = [
    {
        "name": "Inspección de Extintores",
        "description": "Inspección mensual de extintores portátiles conforme al formato de control.",
        "category": "Equipos de emergencia",
        "structure_type": "formulario_matriz",
        "suggested_periodicity": "mensual",
        "suggested_pdf_template": "eureka_extintores",
        "fields_schema": [
            # ==========================
            # Datos generales
            # ==========================
            {
                "name": "Área inspeccionada",
                "field_key": "area",
                "field_type": "texto",
                "is_required": True,
                "order": 0,
                "scope": "general"
            },
            {
                "name": "Inspector",
                "field_key": "inspector",
                "field_type": "texto",
                "is_required": False,
                "order": 1,
                "scope": "general"
            },
            {
                "name": "Fecha de inspección",
                "field_key": "fecha_inspeccion",
                "field_type": "fecha",
                "is_required": True,
                "order": 2,
                "scope": "general"
            },

            # ==========================
            # Matriz
            # ==========================
            {
                "name": "N° Extintor",
                "field_key": "num_extintor",
                "field_type": "texto",
                "is_required": True,
                "order": 0,
                "scope": "matriz"
            },
            {
                "name": "Tipo de Extintor",
                "field_key": "tipo_de_extintor",
                "field_type": "seleccion",
                "options": "PQS|CO2|Agua|Espuma|ABC|Clase D|Clase K",
                "is_required": True,
                "order": 1,
                "scope": "matriz"
            },
            {
                "name": "Clase de Agente Extintor",
                "field_key": "clase_de_agente_extintor",
                "field_type": "seleccion",
                "options": "A|B|C|ABC|BC|D|K",
                "is_required": True,
                "order": 2,
                "scope": "matriz"
            },
            {
                "name": "Capacidad (Lb)",
                "field_key": "capacidad_lb",
                "field_type": "numero",
                "is_required": True,
                "order": 3,
                "scope": "matriz"
            },
            {
                "name": "Fecha Recarga Actual",
                "field_key": "actual",
                "field_type": "fecha_mes_anio",
                "is_required": True,
                "order": 4,
                "scope": "matriz"
            },
            {
                "name": "Próxima Recarga",
                "field_key": "proxima",
                "field_type": "fecha_mes_anio",
                "is_required": True,
                "order": 5,
                "scope": "matriz"
            },
            {
                "name": "Ubicación",
                "field_key": "ubicacion",
                "field_type": "texto",
                "is_required": True,
                "order": 6,
                "scope": "matriz"
            },

            # ==========================
            # Condiciones del Extintor
            # ==========================

            {
                "name": "Sello de garantía",
                "field_key": "sello_de_garantia",
                "field_type": "check_sn",
                "is_required": True,
                "order": 7,
                "scope": "matriz"
            },
            {
                "name": "Manómetro",
                "field_key": "manometro",
                "field_type": "check_bm",
                "is_required": True,
                "order": 8,
                "scope": "matriz"
            },
            {
                "name": "Presión",
                "field_key": "presion",
                "field_type": "check_bm",
                "is_required": True,
                "order": 9,
                "scope": "matriz"
            },
            {
                "name": "Recipiente",
                "field_key": "recipiente",
                "field_type": "check_bm",
                "is_required": True,
                "order": 10,
                "scope": "matriz"
            },
            {
                "name": "Manija",
                "field_key": "manija",
                "field_type": "check_bm",
                "is_required": True,
                "order": 11,
                "scope": "matriz"
            },
            {
                "name": "Manguera",
                "field_key": "manguera",
                "field_type": "check_bm",
                "is_required": True,
                "order": 12,
                "scope": "matriz"
            },
            {
                "name": "Pintura",
                "field_key": "pintura",
                "field_type": "check_sn",
                "is_required": True,
                "order": 13,
                "scope": "matriz"
            },
            {
                "name": "Señalización / Demarcación",
                "field_key": "senalizacion",
                "field_type": "check_sn",
                "is_required": True,
                "order": 14,
                "scope": "matriz"
            },
            {
                "name": "Observaciones",
                "field_key": "observaciones",
                "field_type": "observacion",
                "is_required": False,
                "order": 15,
                "scope": "matriz"
            }
        ]
    }
]