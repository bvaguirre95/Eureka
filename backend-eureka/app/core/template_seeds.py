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
    # ─────────────────────────────────────────────────────────────────
    # 1. EXTINTORES — Formulario + Matriz
    # ─────────────────────────────────────────────────────────────────
    {
        "name": "Inspección de Extintores",
        "description": "Verificación periódica del estado, carga, señalización y accesibilidad de extintores portátiles.",
        "category": "Equipos de emergencia",
        "structure_type": "formulario_matriz",
        "suggested_periodicity": "mensual",
        "suggested_pdf_template": "eureka_extintores",
        "fields_schema": [
            # Datos generales
            {"name": "Área inspeccionada", "field_key": "area", "field_type": "texto", "is_required": True, "order": 0, "scope": "general"},
            {"name": "Responsable del área", "field_key": "responsable", "field_type": "texto", "is_required": False, "order": 1, "scope": "general"},
            # Columnas de la matriz
            {"name": "Código extintor", "field_key": "codigo", "field_type": "texto", "is_required": True, "order": 0, "scope": "matriz"},
            {"name": "Ubicación", "field_key": "ubicacion", "field_type": "texto", "is_required": True, "order": 1, "scope": "matriz"},
            {"name": "Tipo", "field_key": "tipo", "field_type": "seleccion", "options": "PQS|CO2|AGUA|AFFF|HALÓN", "is_required": True, "order": 2, "scope": "matriz"},
            {"name": "Capacidad (kg/L)", "field_key": "capacidad", "field_type": "texto", "is_required": False, "order": 3, "scope": "matriz"},
            {"name": "Fecha de vencimiento", "field_key": "fecha_vencimiento", "field_type": "fecha", "is_required": True, "order": 4, "scope": "matriz"},
            {"name": "Señalización", "field_key": "senalizacion", "field_type": "check_sn", "is_required": True, "order": 5, "scope": "matriz"},
            {"name": "Accesibilidad", "field_key": "accesibilidad", "field_type": "check_sn", "is_required": True, "order": 6, "scope": "matriz"},
            {"name": "Estado del extintor", "field_key": "estado", "field_type": "seleccion", "options": "Conforme|No conforme|Requiere recarga", "is_required": True, "order": 7, "scope": "matriz"},
            {"name": "Observaciones", "field_key": "observaciones", "field_type": "observacion", "is_required": False, "order": 8, "scope": "matriz"},
        ],
    },

    # ─────────────────────────────────────────────────────────────────
    # 2. BOTIQUÍN — Formulario simple
    # ─────────────────────────────────────────────────────────────────
    {
        "name": "Inspección de Botiquín",
        "description": "Verificación del contenido, estado y accesibilidad del botiquín de primeros auxilios.",
        "category": "Primeros auxilios",
        "structure_type": "formulario",
        "suggested_periodicity": "mensual",
        "suggested_pdf_template": "generico",
        "fields_schema": [
            {"name": "Área / Ubicación", "field_key": "area", "field_type": "texto", "is_required": True, "order": 0, "scope": "general"},
            {"name": "Medicamentos vigentes (no caducados)", "field_key": "medicamentos_vigentes", "field_type": "check_sn", "is_required": True, "order": 1, "scope": "general"},
            {"name": "Botiquín señalizado", "field_key": "senalizado", "field_type": "check_sn", "is_required": True, "order": 2, "scope": "general"},
            {"name": "Botiquín accesible", "field_key": "accesible", "field_type": "check_sn", "is_required": True, "order": 3, "scope": "general"},
            {"name": "Inventario actualizado", "field_key": "inventario", "field_type": "check_sn", "is_required": True, "order": 4, "scope": "general"},
            {"name": "Guantes y mascarilla presentes", "field_key": "guantes_mascarilla", "field_type": "check_sn", "is_required": False, "order": 5, "scope": "general"},
            {"name": "Vendas y gasa presentes", "field_key": "vendas_gasa", "field_type": "check_sn", "is_required": False, "order": 6, "scope": "general"},
            {"name": "Observaciones generales", "field_key": "observaciones", "field_type": "observacion", "is_required": False, "order": 7, "scope": "general"},
        ],
    },

    # ─────────────────────────────────────────────────────────────────
    # 3. EPP — Matriz por trabajador
    # ─────────────────────────────────────────────────────────────────
    {
        "name": "Inspección de EPP por Trabajador",
        "description": "Verificación del estado y uso correcto de equipos de protección personal por cada trabajador.",
        "category": "EPP",
        "structure_type": "formulario_matriz",
        "suggested_periodicity": "mensual",
        "suggested_pdf_template": "generico",
        "fields_schema": [
            {"name": "Área / Proceso", "field_key": "area", "field_type": "texto", "is_required": True, "order": 0, "scope": "general"},
            # Columnas por trabajador
            {"name": "Nombre del trabajador", "field_key": "trabajador", "field_type": "texto", "is_required": True, "order": 0, "scope": "matriz"},
            {"name": "Cargo", "field_key": "cargo", "field_type": "texto", "is_required": False, "order": 1, "scope": "matriz"},
            {"name": "Casco", "field_key": "casco", "field_type": "check_sna", "is_required": False, "order": 2, "scope": "matriz", "group_name": "EPP"},
            {"name": "Gafas de seguridad", "field_key": "gafas", "field_type": "check_sna", "is_required": False, "order": 3, "scope": "matriz", "group_name": "EPP"},
            {"name": "Guantes", "field_key": "guantes", "field_type": "check_sna", "is_required": False, "order": 4, "scope": "matriz", "group_name": "EPP"},
            {"name": "Zapatos de seguridad", "field_key": "zapatos", "field_type": "check_sna", "is_required": False, "order": 5, "scope": "matriz", "group_name": "EPP"},
            {"name": "Chaleco reflectivo", "field_key": "chaleco", "field_type": "check_sna", "is_required": False, "order": 6, "scope": "matriz", "group_name": "EPP"},
            {"name": "Protección auditiva", "field_key": "auditiva", "field_type": "check_sna", "is_required": False, "order": 7, "scope": "matriz", "group_name": "EPP"},
            {"name": "Estado general del EPP", "field_key": "estado", "field_type": "seleccion", "options": "Bueno|Regular|Requiere reposición", "is_required": True, "order": 8, "scope": "matriz"},
            {"name": "Observaciones", "field_key": "observaciones", "field_type": "observacion", "is_required": False, "order": 9, "scope": "matriz"},
        ],
    },

    # ─────────────────────────────────────────────────────────────────
    # 4. VEHÍCULOS — Formulario + Matriz
    # ─────────────────────────────────────────────────────────────────
    {
        "name": "Inspección Pre-operacional de Vehículos",
        "description": "Revisión diaria de condiciones mecánicas y de seguridad antes de operar el vehículo.",
        "category": "Vehículos y maquinaria",
        "structure_type": "formulario_matriz",
        "suggested_periodicity": "diario",
        "suggested_pdf_template": "generico",
        "fields_schema": [
            {"name": "Placa / Código del vehículo", "field_key": "placa", "field_type": "texto", "is_required": True, "order": 0, "scope": "general"},
            {"name": "Conductor", "field_key": "conductor", "field_type": "texto", "is_required": True, "order": 1, "scope": "general"},
            {"name": "Kilometraje", "field_key": "kilometraje", "field_type": "numero", "is_required": False, "order": 2, "scope": "general"},
            # Ítems de inspección
            {"name": "Ítem", "field_key": "item", "field_type": "texto", "is_required": True, "order": 0, "scope": "matriz"},
            {"name": "Estado", "field_key": "estado", "field_type": "check_sna", "is_required": True, "order": 1, "scope": "matriz"},
            {"name": "Observaciones", "field_key": "observaciones", "field_type": "observacion", "is_required": False, "order": 2, "scope": "matriz"},
        ],
    },

    # ─────────────────────────────────────────────────────────────────
    # 5. INSTALACIONES / ORDEN Y LIMPIEZA — Formulario + Matriz
    # ─────────────────────────────────────────────────────────────────
    {
        "name": "Inspección de Orden y Limpieza",
        "description": "Verificación de condiciones de orden, limpieza y señalización por áreas.",
        "category": "Instalaciones",
        "structure_type": "formulario_matriz",
        "suggested_periodicity": "semanal",
        "suggested_pdf_template": "generico",
        "fields_schema": [
            {"name": "Turno", "field_key": "turno", "field_type": "seleccion", "options": "Mañana|Tarde|Noche", "is_required": False, "order": 0, "scope": "general"},
            # Por área
            {"name": "Área", "field_key": "area", "field_type": "texto", "is_required": True, "order": 0, "scope": "matriz"},
            {"name": "Pisos libres de obstáculos", "field_key": "pisos", "field_type": "check_sn", "is_required": True, "order": 1, "scope": "matriz", "group_name": "Orden"},
            {"name": "Materiales almacenados correctamente", "field_key": "almacenamiento", "field_type": "check_sn", "is_required": True, "order": 2, "scope": "matriz", "group_name": "Orden"},
            {"name": "Señalización visible", "field_key": "senalizacion", "field_type": "check_sn", "is_required": True, "order": 3, "scope": "matriz", "group_name": "Señalización"},
            {"name": "Salidas de emergencia despejadas", "field_key": "salidas", "field_type": "check_sn", "is_required": True, "order": 4, "scope": "matriz", "group_name": "Señalización"},
            {"name": "Nivel de limpieza", "field_key": "limpieza", "field_type": "seleccion", "options": "Bueno|Regular|Deficiente", "is_required": True, "order": 5, "scope": "matriz", "group_name": "Limpieza"},
            {"name": "Observaciones", "field_key": "observaciones", "field_type": "observacion", "is_required": False, "order": 6, "scope": "matriz"},
        ],
    },
]