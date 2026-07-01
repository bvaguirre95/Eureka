"""
Sincroniza el catálogo de permisos de la BD con PERMISSIONS_CATALOG.
- Agrega permisos nuevos que no estén en BD.
- Actualiza nombre/módulo/descripción si cambiaron.
- Nunca elimina permisos (podrían estar asignados a roles activos).

Se llama automáticamente al arrancar la app (lifespan de FastAPI).
"""
import logging

from sqlalchemy.orm import Session

from app.core.permissions_catalog import PERMISSIONS_CATALOG
from app.models.permission import Permission

logger = logging.getLogger(__name__)


def sync_permissions(db: Session) -> None:
    from app.core.permissions_catalog import PERMISSIONS_CATALOG
    existing = {p.code: p for p in db.query(Permission).all()}
    added = updated = 0

    for code, module, name, description in PERMISSIONS_CATALOG:
        if code not in existing:
            db.add(Permission(code=code, module=module, name=name, description=description))
            added += 1
        else:
            perm = existing[code]
            if perm.module != module or perm.name != name or perm.description != description:
                perm.module = module
                perm.name = name
                perm.description = description
                updated += 1

    if added or updated:
        db.commit()
        logger.info(f"Permisos sincronizados: +{added} nuevos, {updated} actualizados.")
    else:
        logger.debug("Permisos sin cambios.")
