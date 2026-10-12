# Eureka SST - Backend (IAM base con RBAC dinámico)

API base del sistema de gestión de SST de Consultora Eureka. Este entregable
cubre la **arquitectura modular (MVC)** y el módulo de **IAM con roles y
permisos dinámicos** (al estilo NexusCore): usuarios, roles configurables,
catálogo de permisos y empresas.

## Arquitectura

```
app/
├── main.py            # Punto de entrada FastAPI (Vista/entrada HTTP)
├── core/
│   ├── config.py      # Settings (variables de entorno)
│   └── security.py    # Hashing de passwords + JWT (access/refresh)
├── database.py         # Engine y sesión de SQLAlchemy
├── models/             # Modelos (Model) - tablas de PostgreSQL
│   ├── permission.py   # Catálogo de permisos (ej. "companies.create")
│   ├── role.py         # Roles dinámicos + tabla puente role_permissions
│   ├── user.py         # role_id (FK dinámica a roles)
│   ├── company.py
│   └── user_company.py # tabla puente (asignaciones técnico <-> empresas)
├── schemas/             # Pydantic schemas (validación de entrada/salida)
├── crud/                # Capa de acceso a datos / lógica de negocio
└── api/
    ├── deps.py          # DB session, usuario actual, require_permission()
    └── v1/               # Controladores (Controller) - endpoints REST
        ├── auth.py
        ├── users.py
        ├── companies.py
        ├── roles.py
        └── permissions.py
```

## Modelo de roles y permisos (RBAC dinámico)

A diferencia de un enum fijo, los roles se crean y configuran desde el
sistema (módulo "Roles y Permisos"):

- **`permissions`**: catálogo de permisos granulares, código tipo
  `"<modulo>.<accion>"` (ej. `companies.create`, `users.view`,
  `roles.manage`). Cada módulo nuevo (gestión documental, reportes, etc.)
  simplemente agrega sus propios códigos al catálogo.
- **`roles`**: el admin crea roles con un nombre libre (ej. "Coordinador
  Zona Sur"), les asigna los permisos que necesite, y define:
  - `is_company_scoped`: si `true`, los usuarios con ese rol solo ven las
    empresas que tengan asignadas en `user_companies`. Si `false`, ven
    todas las empresas.
  - `is_system`: el rol "Administrador" viene protegido (no se puede
    eliminar ni renombrar) para garantizar que siempre exista un rol con
    acceso total.
- **`role_permissions`**: tabla puente muchos-a-muchos.
- **`users.role_id`**: cada usuario tiene un rol; sus permisos y su alcance
  de empresas se derivan 100% de ese rol.

Control de acceso en los endpoints vía `require_permission("codigo")`:

```python
@router.post("/", dependencies=[Depends(require_permission("companies.create"))])
```

## Roles sembrados por defecto (editables, excepto Administrador)

| Rol           | is_company_scoped | Permisos iniciales                          |
|---------------|--------------------|-----------------------------------------------|
| Administrador | false (sistema)    | TODOS                                          |
| Supervisor    | false              | companies.view, users.view, roles.view         |
| Técnico SST   | true               | companies.view                                 |
| Empresa       | true               | companies.view                                 |

Estos roles son solo un punto de partida: el admin puede renombrarlos,
cambiar sus permisos, su alcance, o crear roles completamente nuevos desde
`/api/v1/roles`.

## Instalación

1. Crear entorno virtual e instalar dependencias:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Copiar `.env.example` a `.env` y ajustar `DATABASE_URL` (PostgreSQL) y
   `SECRET_KEY`.

3. Generar y aplicar la primera migración:

```bash
alembic revision --autogenerate -m "init: permisos, roles, usuarios, empresas"
alembic upgrade head
```

4. Sembrar catálogo de permisos, roles iniciales y usuario administrador:

```bash
python -m scripts.seed
```

Esto crea `admin@consultoraeureka.ec` / `CambiarEsta123!` con el rol
"Administrador" (cámbiala apenas inicies sesión).

5. Levantar el servidor:

```bash
uvicorn app.main:app --reload
```

Documentación interactiva en `http://localhost:8000/docs`.

## Endpoints implementados

### Autenticación (`/api/v1/auth`)
- `POST /login`, `POST /refresh`, `GET /me` (incluye `role` con sus
  `permissions` para que el frontend arme el menú dinámicamente).

### Usuarios (`/api/v1/users`)
- Requieren `users.view` / `users.create` / `users.edit` / `users.delete`.
- `POST` y `PUT` aceptan `role_id` y `company_ids`. Si el rol es
  `is_company_scoped`, se exige al menos una empresa asignada.

### Empresas (`/api/v1/companies`)
- `GET /` filtrada automáticamente: roles no acotados ven todas, roles
  acotados solo las asignadas.
- `POST`/`PUT`/`DELETE` requieren `companies.create` / `.edit` / `.delete`.

### Roles (`/api/v1/roles`) — requieren `roles.view` (lectura) / `roles.manage` (escritura)
- CRUD completo. `POST`/`PUT` aceptan `permission_ids` para definir los
  permisos del rol. El rol "Administrador" no se puede renombrar ni
  eliminar, pero sí ajustar sus permisos.

### Permisos (`/api/v1/permissions`)
- `GET /` — catálogo completo, usado por el frontend para construir el
  formulario de creación/edición de roles (checkboxes por permiso).

## Próximos pasos (siguientes módulos)

1. **Catálogo normativo de documentos** (los ~30 requisitos de SST según
   normativa ecuatoriana, con periodicidad y aplicabilidad por número de
   trabajadores) — agrega permisos `documents.*` al catálogo.
2. **Documentos por empresa** (carga, estados, validación, almacenamiento
   en filesystem local).
3. **Informes periódicos** (mensuales/bimestrales del organismo paritario).
4. Frontend: páginas de gestión de Roles/Permisos y Usuarios conectadas a
   estos endpoints.

