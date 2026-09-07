"""
Catálogo central de permisos del sistema.
Este archivo es la ÚNICA fuente de verdad de qué permisos existen.

Al agregar un módulo nuevo:
1. Añade sus permisos aquí en el módulo correspondiente.
2. Al arrancar la app (o correr el seed), se sincronizan solos con la BD.
3. Asígnalos a los roles base en BASE_ROLES de crud/organization.py
   (para organizaciones nuevas) y en scripts/seed.py (para Eureka).

Estructura de cada permiso:
  (code, module, name, description)
"""

PERMISSIONS_CATALOG = [
    # ── Usuarios ──────────────────────────────────────────────────────────────
    ("users.view",   "Usuarios", "Ver usuarios",        "Consultar el listado de usuarios"),
    ("users.create", "Usuarios", "Crear usuarios",      "Registrar nuevos usuarios"),
    ("users.edit",   "Usuarios", "Editar usuarios",     "Modificar datos, rol y empresas asignadas"),
    ("users.delete", "Usuarios", "Desactivar usuarios", "Desactivar cuentas de usuario"),

    # ── Empresas ──────────────────────────────────────────────────────────────
    ("companies.view",   "Empresas", "Ver empresas",       "Consultar empresas"),
    ("companies.create", "Empresas", "Crear empresas",     "Registrar nuevas empresas"),
    ("companies.edit",   "Empresas", "Editar empresas",    "Modificar datos de empresas"),
    ("companies.delete", "Empresas", "Desactivar empresas","Desactivar empresas"),

    # ── Roles y permisos ──────────────────────────────────────────────────────
    ("roles.view",   "Roles", "Ver roles",       "Consultar roles y sus permisos"),
    ("roles.manage", "Roles", "Gestionar roles", "Crear, editar y eliminar roles"),

    # ── Gestión Documental ────────────────────────────────────────────────────
    ("documents.view",             "Documentos", "Ver documentos",               "Consultar la matriz documental"),
    ("documents.upload",           "Documentos", "Cargar documentos",            "Subir archivos a la matriz"),
    ("documents.validate",         "Documentos", "Validar documentos",           "Aprobar o rechazar documentos cargados"),
    ("documents.replace_validated","Documentos", "Reemplazar validados",         "Reemplazar un documento ya validado (reabre validación)"),
    ("documents.manage_catalog",   "Documentos", "Gestionar catálogo normativo", "Crear y editar items del catálogo normativo"),

    # ── Configuración ─────────────────────────────────────────────────────────
    ("settings.manage.category", "Configuración", "Gestionar configuración", "Administrar categorías y ajustes del módulo documental"),
    ("settings.manage.geritra",  "Configuración", "Gestionar GERITRA",      "Administrar categorías y factores de riesgo del módulo GERITRA"),
    ("settings.manage.signers",  "Configuración", "Gestionar firmantes",      "Administrar firmantes de informes"),
    # ── Diagnóstico Anexo 1 ───────────────────────────────────────────────────
    ("diagnostics.view",   "Diagnósticos", "Ver diagnósticos",    "Consultar diagnósticos Anexo 1"),
    ("diagnostics.create", "Diagnósticos", "Crear diagnósticos",  "Iniciar y editar diagnósticos Anexo 1"),
    ("diagnostics.edit",   "Diagnósticos", "Editar diagnósticos", "Modificar diagnósticos Anexo 1"),
    ("diagnostics.delete", "Diagnósticos", "Eliminar diagnósticos","Eliminar diagnósticos"),

    # ── Inspecciones ──────────────────────────────────────────────────────────────
    ("inspections.view",   "Inspecciones", "Ver inspecciones",             "Consultar inspecciones y dashboard"),
    ("inspections.create", "Inspecciones", "Crear/editar inspecciones",    "Registrar y editar inspecciones y hallazgos"),
    ("inspections.manage", "Inspecciones", "Gestionar tipos de inspección","Crear y configurar tipos de inspección (solo Supervisor/Admin)"),
    ("inspections.delete", "Inspecciones", "Eliminar inspecciones",        "Eliminar registros de inspección"),

    ("sequences.view",    "Secuencias", "Ver secuencias","Consultar definiciones y contadores de secuencias"),
    ("sequences.create",  "Secuencias", "Crear secuencias","Registrar nuevas definiciones de secuencia"),
    ("sequences.edit",    "Secuencias", "Editar secuencias","Modificar definiciones de secuencia"),
    ("sequences.delete",  "Secuencias", "Eliminar secuencias", "Eliminar definiciones y sus contadores"),
    ("sequences.execute", "Secuencias", "Ejecutar secuencias", "Generar el siguiente código de una secuencia"),

    ("risks.view",   "GERITRA", "Ver matrices de riesgo",      "Consultar matrices GERITRA y puestos de trabajo"),
    ("risks.create", "GERITRA", "Crear/editar matrices",       "Registrar y editar matrices de riesgo y puestos"),
    ("risks.manage", "GERITRA", "Gestionar catálogo de riesgos","Crear categorías y factores de riesgo"),
    ("risks.delete", "GERITRA", "Eliminar matrices",           "Eliminar matrices y puestos de trabajo"),
     ("workers.view",       "Trabajadores", "Ver trabajadores",               "Consultar listado y ficha de trabajadores"),
    ("workers.create",     "Trabajadores", "Registrar trabajadores",          "Crear nuevos registros de trabajadores"),
    ("workers.edit",       "Trabajadores", "Editar trabajadores",             "Modificar datos laborales e identificación"),
    ("workers.deactivate", "Trabajadores", "Retirar / desactivar trabajadores","Cambiar estado a Retirado, Inactivo o Suspendido"),
    # ── NUEVO MÓDULO — plantilla para 
    # ── NUEVO MÓDULO — plantilla para copiar ──────────────────────────────────
    # ("mi_modulo.view",   "Mi Módulo", "Ver X",    "..."),
    # ("mi_modulo.create", "Mi Módulo", "Crear X",  "..."),
    # ("mi_modulo.edit",   "Mi Módulo", "Editar X", "..."),
    # ("mi_modulo.delete", "Mi Módulo", "Eliminar X","..."),
]
