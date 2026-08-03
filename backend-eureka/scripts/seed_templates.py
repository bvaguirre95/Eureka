"""
Script para poblar las plantillas globales del sistema.
Ejecutar una vez después de la migración:

    cd backend-eureka
    python scripts/seed_templates.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.inspection_template import InspectionTemplate, TemplateSourceEnum
from app.models.inspection import StructureTypeEnum
from app.core.template_seeds import GLOBAL_TEMPLATES


def seed():
    db = SessionLocal()
    try:
        existing_names = {
            t.name for t in db.query(InspectionTemplate)
            .filter(InspectionTemplate.organization_id == None).all()
        }

        added = 0
        for tpl in GLOBAL_TEMPLATES:
            if tpl["name"] in existing_names:
                print(f"  ⏭  Ya existe: {tpl['name']}")
                continue

            obj = InspectionTemplate(
                organization_id=None,
                name=tpl["name"],
                description=tpl.get("description"),
                category=tpl.get("category"),
                structure_type=StructureTypeEnum(tpl["structure_type"]),
                source=TemplateSourceEnum.GLOBAL,
                suggested_periodicity=tpl.get("suggested_periodicity"),
                suggested_pdf_template=tpl.get("suggested_pdf_template", "generico"),
                fields_schema=tpl["fields_schema"],
                is_active=True,
                times_used=0,
                created_by_id=None,
            )
            db.add(obj)
            added += 1
            print(f"  ✅ Creada: {tpl['name']}")

        db.commit()
        print(f"\n✅ Proceso completado — {added} plantilla(s) nueva(s) insertada(s).")
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()