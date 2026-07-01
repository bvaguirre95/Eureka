from typing import List, Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.organization import Organization
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User
from app.models.user_company import UserCompany
from app.schemas.organization import OrganizationCreate, OrganizationUpdate

# ---------------------------------------------------------------------------
# Roles base que se crean para TODA organización nueva (mismos del seed).
# El Administrador recibe todos los permisos disponibles en la plataforma.
# ---------------------------------------------------------------------------
BASE_ROLES = [
    {
        "name": "Administrador",
        "description": "Acceso total a la organización.",
        "is_company_scoped": False,
        "is_system": True,
        "all_permissions": True,
    },
    {
        "name": "Supervisor",
        "description": "Visión transversal de cumplimiento de todas las empresas.",
        "is_company_scoped": False,
        "is_system": False,
        "permission_codes": [
            "companies.view", "users.view", "roles.view",
            "documents.view", "documents.replace_validated",
            "diagnostics.view",
            "inspections.view", "inspections.manage",
        ],
    },
    {
        "name": "Técnico SST",
        "description": "Gestiona las empresas que tiene asignadas.",
        "is_company_scoped": True,
        "is_system": False,
        "permission_codes": [
            "companies.view", "documents.view", "documents.upload",
            "diagnostics.view", "diagnostics.create",
            "inspections.view", "inspections.create",
        ],
    },
    {
        "name": "Empresa",
        "description": "Usuario de la empresa cliente: revisa su documentación validada.",
        "is_company_scoped": True,
        "is_system": False,
        "permission_codes": [
            "companies.view", "documents.view", "documents.validate",
            "diagnostics.view", "inspections.view",
        ],
    },
]


def _seed_org_roles(db: Session, org: Organization) -> Role:
    """
    Crea los 4 roles base para la organización y devuelve el rol
    Administrador (para asignarlo al usuario inicial).
    """
    all_permissions = db.execute(select(Permission)).scalars().all()
    perm_by_code = {p.code: p for p in all_permissions}

    admin_role = None
    for spec in BASE_ROLES:
        role = Role(
            name=spec["name"],
            description=spec["description"],
            is_company_scoped=spec["is_company_scoped"],
            is_system=spec["is_system"],
            organization_id=org.id,
        )
        db.add(role)
        db.flush()

        if spec.get("all_permissions"):
            role.permissions = list(all_permissions)
        else:
            role.permissions = [
                perm_by_code[code]
                for code in spec.get("permission_codes", [])
                if code in perm_by_code
            ]

        if spec["name"] == "Administrador":
            admin_role = role

    return admin_role


def get_organization(db: Session, org_id: int) -> Optional[Organization]:
    return db.get(Organization, org_id)


def get_organizations(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Organization]:
    stmt = select(Organization)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(Organization.name.ilike(pattern), Organization.ruc.ilike(pattern))
        )
    stmt = stmt.order_by(Organization.name).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def count_organizations(db: Session, search: Optional[str] = None) -> int:
    stmt = select(func.count()).select_from(Organization)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(Organization.name.ilike(pattern), Organization.ruc.ilike(pattern))
        )
    return db.execute(stmt).scalar_one()


def create_organization_with_admin(
    db: Session, org_in: OrganizationCreate
) -> Tuple[Organization, User, str]:
    """
    Crea la organización, sus 4 roles base y el usuario administrador inicial
    en una sola transacción atómica.

    Devuelve (organización, usuario_admin, contraseña_en_texto_claro).
    """
    # 1. Organización
    org_data = org_in.model_dump(
        exclude={"admin_full_name", "admin_email", "admin_password"}
    )
    org = Organization(**org_data)
    db.add(org)
    db.flush()

    # 2. Roles base (con todos los permisos del sistema)
    admin_role = _seed_org_roles(db, org)

    # 3. Usuario administrador inicial
    admin_user = User(
        email=org_in.admin_email,
        hashed_password=get_password_hash(org_in.admin_password),
        full_name=org_in.admin_full_name,
        role_id=admin_role.id,
        organization_id=org.id,
        is_active=True,
    )
    db.add(admin_user)
    db.commit()
    db.refresh(org)
    db.refresh(admin_user)

    return org, admin_user, org_in.admin_password


def update_organization(
    db: Session, org: Organization, org_in: OrganizationUpdate
) -> Organization:
    for field, value in org_in.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    db.commit()
    db.refresh(org)
    return org
