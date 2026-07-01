"""
Script de inicialización de datos (idempotente).
Crea: organización Eureka, catálogo de permisos, roles iniciales,
catálogo normativo global y usuario super-admin.

Uso:
    python -m scripts.seed
"""
from sqlalchemy import select
from app.core.permissions_catalog import PERMISSIONS_CATALOG
from app.crud.document_catalog import get_catalog_item_by_code
from app.crud.permission import get_permission_by_code
from app.crud.role import get_role_by_name
from app.crud.user import create_user, get_user_by_email
from app.database import SessionLocal
from app.models.document_catalog import DocumentCatalogItem, PeriodicityEnum
from app.models.organization import Organization, OrgTypeEnum
from app.models.permission import Permission
from app.models.role import Role
from app.schemas.user import UserCreate

# ---------------------------------------------------------------------------
# Catálogo normativo global (PSST)
# ---------------------------------------------------------------------------
DOCUMENT_CATALOG_SEED = [
    {
        "code": "PSST-001",
        "name": "Política de Seguridad y Salud en el Trabajo",
        "description": "Documento firmado por la máxima autoridad.",
        "category": "Gestión de SST",
        "periodicity": PeriodicityEnum.UNICO,
        "min_workers": 0,
        "max_workers": None,
    },
    {
        "code": "PSST-002",
        "name": "Plan Mínimo de Prevención de Riesgos Laborales",
        "description": "Aplica a empresas de 1 a 9 trabajadores.",
        "category": "Gestión de SST",
        "periodicity": PeriodicityEnum.ANUAL,
        "min_workers": 1,
        "max_workers": 9,
    },
    {
        "code": "PSST-003",
        "name": "Reglamento Interno de Seguridad y Salud en el Trabajo",
        "description": "Obligatorio para 10 o más trabajadores.",
        "category": "Gestión de SST",
        "periodicity": PeriodicityEnum.ANUAL,
        "min_workers": 10,
        "max_workers": None,
    },
    {
        "code": "PSST-004",
        "name": "Matriz de Identificación y Evaluación de Riesgos Laborales",
        "description": "Identificación, medición y control de riesgos.",
        "category": "Gestión de Riesgos",
        "periodicity": PeriodicityEnum.ANUAL,
        "min_workers": 0,
        "max_workers": None,
    },
    {
        "code": "PSST-005",
        "name": "Plan de Emergencia y Contingencia",
        "description": "Procedimientos ante incendios, sismos, evacuación.",
        "category": "Gestión de Riesgos",
        "periodicity": PeriodicityEnum.ANUAL,
        "min_workers": 0,
        "max_workers": None,
    },
    {
        "code": "PSST-006",
        "name": "Programa Anual de Capacitación en SST",
        "description": "Planificación y registros de capacitaciones.",
        "category": "Capacitación",
        "periodicity": PeriodicityEnum.ANUAL,
        "min_workers": 0,
        "max_workers": None,
    },
    {
        "code": "PSST-007",
        "name": "Registro de Entrega de Equipos de Protección Personal (EPP)",
        "description": "Constancia de entrega y reposición de EPP.",
        "category": "Gestión de Riesgos",
        "periodicity": PeriodicityEnum.ANUAL,
        "min_workers": 0,
        "max_workers": None,
    },
    {
        "code": "PSST-008",
        "name": "Conformación del Comité Paritario de SST",
        "description": "Obligatorio para 15 o más trabajadores.",
        "category": "Comité Paritario",
        "periodicity": PeriodicityEnum.ANUAL,
        "min_workers": 15,
        "max_workers": None,
    },
    {
        "code": "PSST-009",
        "name": "Actas Mensuales del Comité Paritario de SST",
        "description": "Registro mensual de reuniones (12 actas al año).",
        "category": "Comité Paritario",
        "periodicity": PeriodicityEnum.MENSUAL,
        "min_workers": 15,
        "max_workers": None,
    },
    {
        "code": "PSST-010",
        "name": "Informe Bimestral de Gestión de SST",
        "description": "Informe técnico bimestral (6 al año).",
        "category": "Comité Paritario",
        "periodicity": PeriodicityEnum.BIMESTRAL,
        "min_workers": 15,
        "max_workers": None,
    },
    {
        "code": "PSST-011",
        "name": "Programa de Vigilancia de la Salud",
        "description": "Exámenes médicos ocupacionales.",
        "category": "Salud Ocupacional",
        "periodicity": PeriodicityEnum.ANUAL,
        "min_workers": 0,
        "max_workers": None,
    },
    {
        "code": "PSST-012",
        "name": "Procedimiento de Permisos de Trabajo de Alto Riesgo",
        "description": "Trabajos en altura, espacios confinados, caliente, eléctrico.",
        "category": "Gestión de Riesgos",
        "periodicity": PeriodicityEnum.UNICO,
        "min_workers": 0,
        "max_workers": None,
    },
]


def seed_organization(db) -> Organization:
    stmt = select(Organization).where(Organization.name == "Consultora Eureka")
    org = db.execute(stmt).scalar_one_or_none()
    if org is None:
        org = Organization(
            name="Consultora Eureka",
            org_type=OrgTypeEnum.CONSULTORA,
            email="ventas@consultoraeureka.ec",
            is_active=True,
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        print(f"  + Organización creada: {org.name}")
    return org


def seed_permissions(db) -> dict:
    permissions_by_code = {}
    for code, module, name, description in PERMISSIONS_CATALOG:
        permission = get_permission_by_code(db, code)
        if permission is None:
            permission = Permission(code=code, module=module, name=name, description=description)
            db.add(permission)
            db.flush()
            print(f"  + Permiso: {code}")
        permissions_by_code[code] = permission
    db.commit()
    return permissions_by_code


def seed_roles(db, org: Organization, permissions_by_code: dict) -> dict:
    all_codes = list(permissions_by_code.keys())

    roles_spec = [
        {
            "name": "Administrador",
            "description": "Acceso total. Rol protegido.",
            "is_company_scoped": False,
            "is_system": True,
            "permission_codes": all_codes,
        },
        {
            "name": "Supervisor",
            "description": "Visión transversal de todas las empresas.",
            "is_company_scoped": False,
            "is_system": False,
            "permission_codes": ["companies.view", "users.view", "roles.view", "documents.view", "documents.replace_validated"],
        },
        {
            "name": "Técnico SST",
            "description": "Gestiona empresas asignadas.",
            "is_company_scoped": True,
            "is_system": False,
            "permission_codes": ["companies.view", "documents.view", "documents.upload"],
        },
        {
            "name": "Empresa",
            "description": "Revisa y valida documentación propia.",
            "is_company_scoped": True,
            "is_system": False,
            "permission_codes": ["companies.view", "documents.view", "documents.validate"],
        },
    ]

    roles_by_name = {}
    for spec in roles_spec:
        role = get_role_by_name(db, spec["name"], org.id)
        if role is None:
            role = Role(
                name=spec["name"],
                description=spec["description"],
                is_company_scoped=spec["is_company_scoped"],
                is_system=spec["is_system"],
                organization_id=org.id,
            )
            db.add(role)
            db.flush()
            print(f"  + Rol: {spec['name']}")
        role.permissions = [permissions_by_code[code] for code in spec["permission_codes"]]
        roles_by_name[spec["name"]] = role
    db.commit()
    return roles_by_name


DOCUMENT_CATEGORIES_SEED = [
    "Gestión de SST",
    "Gestión de Riesgos",
    "Capacitación",
    "Comité Paritario",
    "Salud Ocupacional",
]


def seed_document_categories(db) -> None:
    from app.crud.document_category import get_category_by_name
    from app.models.document_category import DocumentCategory

    for name in DOCUMENT_CATEGORIES_SEED:
        if get_category_by_name(db, name, None, is_global=True) is None:
            db.add(DocumentCategory(name=name, organization_id=None, is_global=True, is_active=True))
            print(f"  + Categoría: {name}")
    db.commit()


def seed_document_catalog(db) -> None:
    for spec in DOCUMENT_CATALOG_SEED:
        existing = get_catalog_item_by_code(db, spec["code"], organization_id=None, is_global=True)
        if existing is None:
            db.add(DocumentCatalogItem(**spec, is_global=True, organization_id=None, is_active=True))
            print(f"  + Catálogo: {spec['code']}")
    db.commit()


def seed_admin_user(db, org: Organization, admin_role_id: int) -> None:
    admin_email = "admin@consultoraeureka.ec"
    admin_password = "CambiarEsta123!"

    if get_user_by_email(db, admin_email):
        print(f"  El usuario admin ya existe: {admin_email}")
        return

    user_in = UserCreate(
        email=admin_email,
        password=admin_password,
        full_name="Administrador Eureka",
        role_id=admin_role_id,
        is_active=True,
        company_ids=[],
    )
    create_user(db, user_in, organization_id=org.id)
    print(f"  Usuario admin creado: {admin_email} / {admin_password}")
    print("  IMPORTANTE: cambia esta contraseña apenas inicies sesión.")


def seed_platform_superadmin(db, permissions_by_code: dict) -> None:
    """
    Crea un rol y usuario de super-admin de plataforma (organization_id=NULL).
    Este usuario gestiona el panel de Organizaciones (tenants).
    """
    role = get_role_by_name(db, "Super Admin Plataforma", None)
    if role is None:
        role = Role(
            name="Super Admin Plataforma",
            description="Gestiona organizaciones (consultoras y empresas) de la plataforma.",
            is_company_scoped=False,
            is_system=True,
            organization_id=None,
        )
        db.add(role)
        db.flush()
        print("  + Rol: Super Admin Plataforma")

    role.permissions = list(permissions_by_code.values())
    db.commit()

    superadmin_email = "superadmin@eureka.app"
    superadmin_password = "CambiarEsta123!"

    if get_user_by_email(db, superadmin_email):
        print(f"  El super-admin ya existe: {superadmin_email}")
        return

    user_in = UserCreate(
        email=superadmin_email,
        password=superadmin_password,
        full_name="Super Admin Eureka Platform",
        role_id=role.id,
        is_active=True,
        company_ids=[],
    )
    create_user(db, user_in, organization_id=None)
    print(f"  Super-admin creado: {superadmin_email} / {superadmin_password}")
    print("  IMPORTANTE: cambia esta contraseña apenas inicies sesión.")


def main() -> None:
    db = SessionLocal()
    try:
        print("Creando organización Eureka...")
        org = seed_organization(db)

        print("Sembrando catálogo de permisos...")
        permissions_by_code = seed_permissions(db)

        print("Sembrando roles iniciales...")
        roles_by_name = seed_roles(db, org, permissions_by_code)

        print("Sembrando categorías de documentos...")
        seed_document_categories(db)

        print("Sembrando catálogo normativo global...")
        seed_document_catalog(db)

        print("Creando usuario administrador inicial...")
        seed_admin_user(db, org, roles_by_name["Administrador"].id)

        print("Creando super-admin de plataforma...")
        seed_platform_superadmin(db, permissions_by_code)
    finally:
        db.close()

    print("\nListo.")


if __name__ == "__main__":
    main()
