import calendar
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.crud.document_catalog import get_applicable_catalog_items
from app.models.company import Company
from app.models.company_document import CompanyDocument, DocumentStatusEnum
from app.models.document_catalog import DocumentCatalogItem, PeriodicityEnum
from app.schemas.company_document import CompanyDocumentSummary, DocumentMatrixItem

MONTH_NAMES_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]


def generate_periods(periodicity: PeriodicityEnum, year: int):
    """
    Devuelve la lista de períodos que aplican para un item del catálogo en
    un año dado, como tuplas (period_label, period_display, due_date).
    """
    if periodicity == PeriodicityEnum.UNICO:
        return [(None, "Único", None)]

    if periodicity == PeriodicityEnum.ANUAL:
        due = datetime(year, 12, 31, tzinfo=timezone.utc)
        return [(str(year), f"Año {year}", due)]

    if periodicity == PeriodicityEnum.BIANUAL:
        # Vence 2 años después del período seleccionado
        due = datetime(year + 2, 12, 31, tzinfo=timezone.utc)
        return [(str(year), f"Año {year} (bianual)", due)]

    if periodicity == PeriodicityEnum.MENSUAL:
        periods = []
        for month in range(1, 13):
            last_day = calendar.monthrange(year, month)[1]
            due = datetime(year, month, last_day, tzinfo=timezone.utc)
            periods.append((f"{year}-{month:02d}", f"{MONTH_NAMES_ES[month - 1]} {year}", due))
        return periods

    if periodicity == PeriodicityEnum.BIMESTRAL:
        periods = []
        for bimester in range(1, 7):
            start_month = bimester * 2 - 1
            end_month = bimester * 2
            last_day = calendar.monthrange(year, end_month)[1]
            due = datetime(year, end_month, last_day, tzinfo=timezone.utc)
            label_display = (
                f"{MONTH_NAMES_ES[start_month - 1][:3]}-"
                f"{MONTH_NAMES_ES[end_month - 1][:3]} {year}"
            )
            periods.append((f"{year}-B{bimester}", label_display, due))
        return periods

    return []


def _annual_due(year: int):
    """Devuelve (period_label, due_date) estándar para un año."""
    return str(year), datetime(year, 12, 31, tzinfo=timezone.utc)


def get_document_matrix(
    db: Session, company: Company, year: Optional[int] = None, only_validated: bool = False
) -> List[DocumentMatrixItem]:
    """
    Construye la matriz de cumplimiento documental de una empresa.

    Lógica por periodicidad:

    ÚNICO:
      Muestra TODOS los documentos cargados para ese ítem, sin filtro de año.
      Trazabilidad completa.

    ANUAL:
      Muestra TODOS los documentos cargados para ese ítem (todos los años).
      El filtro de año seleccionado NO excluye documentos de otros años.
      Cada año donde existe un documento aparece como una fila separada.
      Trazabilidad completa.

    MENSUAL / BIMESTRAL:
      Muestra solo los períodos del año seleccionado.
      El filtro de año SÍ aplica aquí porque son períodos cortos.

    only_validated=True: solo incluye filas con documentos validados
    (para el rol "Empresa", que no ve pendientes/rechazados).
    """
    year = year or datetime.now(timezone.utc).year

    applicable_items = get_applicable_catalog_items(
        db, company.organization_id, company.num_trabajadores
    )

    catalog_item_ids = [item.id for item in applicable_items]

    # Cargar TODOS los documentos de esta empresa para los ítems aplicables
    all_docs: dict[int, list] = {}   # catalog_item_id → [docs]
    if catalog_item_ids:
        stmt = (
            select(CompanyDocument)
            .options(
                selectinload(CompanyDocument.uploaded_by),
                selectinload(CompanyDocument.validated_by),
            )
            .where(
                CompanyDocument.company_id == company.id,
                CompanyDocument.catalog_item_id.in_(catalog_item_ids),
            )
            .order_by(CompanyDocument.period_label.asc())
        )
        for doc in db.execute(stmt).scalars().all():
            all_docs.setdefault(doc.catalog_item_id, []).append(doc)

    matrix: List[DocumentMatrixItem] = []

    for item in applicable_items:

        # ── ÚNICO ──────────────────────────────────────────────────────────────
        if item.periodicity == PeriodicityEnum.UNICO:
            docs = all_docs.get(item.id, [])
            if docs:
                for doc in docs:
                    if only_validated and doc.status != DocumentStatusEnum.VALIDADO:
                        continue
                    matrix.append(DocumentMatrixItem(
                        catalog_item_id=item.id,
                        code=item.code, name=item.name,
                        category=item.category, periodicity=item.periodicity,
                        period_label=doc.period_label,
                        period_display="Único",
                        company_document_id=doc.id,
                        status=doc.status,
                        has_file=bool(doc.file_path),
                        original_filename=doc.original_filename,
                        uploaded_at=doc.uploaded_at,
                        uploaded_by_name=doc.uploaded_by.full_name if doc.uploaded_by else None,
                        due_date=doc.due_date,
                        validated_at=doc.validated_at,
                        validated_by_name=doc.validated_by.full_name if doc.validated_by else None,
                        rejection_reason=doc.rejection_reason,
                    ))
            else:
                if not only_validated:
                    matrix.append(DocumentMatrixItem(
                        catalog_item_id=item.id,
                        code=item.code, name=item.name,
                        category=item.category, periodicity=item.periodicity,
                        period_label=None, period_display="Único",
                        company_document_id=None,
                        status=DocumentStatusEnum.PENDIENTE,
                        has_file=False, due_date=None,
                    ))

        # ── ANUAL ──────────────────────────────────────────────────────────────
        elif item.periodicity == PeriodicityEnum.ANUAL:
            docs = all_docs.get(item.id, [])

            # Agrupar por period_label (cada año es una fila)
            by_year: dict[str, CompanyDocument] = {}
            for doc in docs:
                lbl = doc.period_label or str(year)
                by_year[lbl] = doc

            if by_year:
                # Ordenar años desc para mostrar el más reciente primero
                for lbl in sorted(by_year.keys(), reverse=True):
                    doc = by_year[lbl]
                    if only_validated and doc.status != DocumentStatusEnum.VALIDADO:
                        continue
                    _, default_due = _annual_due(int(lbl)) if lbl.isdigit() else (lbl, None)
                    matrix.append(DocumentMatrixItem(
                        catalog_item_id=item.id,
                        code=item.code, name=item.name,
                        category=item.category, periodicity=item.periodicity,
                        period_label=lbl,
                        period_display=f"Año {lbl}",
                        company_document_id=doc.id,
                        status=doc.status,
                        has_file=bool(doc.file_path),
                        original_filename=doc.original_filename,
                        uploaded_at=doc.uploaded_at,
                        uploaded_by_name=doc.uploaded_by.full_name if doc.uploaded_by else None,
                        due_date=doc.due_date or default_due,
                        validated_at=doc.validated_at,
                        validated_by_name=doc.validated_by.full_name if doc.validated_by else None,
                        rejection_reason=doc.rejection_reason,
                    ))
            else:
                # No existe ningún doc — mostrar pendiente para el año seleccionado
                if not only_validated:
                    _, default_due = _annual_due(year)
                    matrix.append(DocumentMatrixItem(
                        catalog_item_id=item.id,
                        code=item.code, name=item.name,
                        category=item.category, periodicity=item.periodicity,
                        period_label=str(year), period_display=f"Año {year}",
                        company_document_id=None,
                        status=DocumentStatusEnum.PENDIENTE,
                        has_file=False, due_date=default_due,
                    ))

        # ── MENSUAL / BIMESTRAL ────────────────────────────────────────────────
        else:
            docs_by_key: dict[str, CompanyDocument] = {
                doc.period_label: doc
                for doc in all_docs.get(item.id, [])
            }
            for period_label, period_display, due_date in generate_periods(item.periodicity, year):
                doc = docs_by_key.get(period_label)
                if doc:
                    if only_validated and doc.status != DocumentStatusEnum.VALIDADO:
                        continue
                    matrix.append(DocumentMatrixItem(
                        catalog_item_id=item.id,
                        code=item.code, name=item.name,
                        category=item.category, periodicity=item.periodicity,
                        period_label=period_label, period_display=period_display,
                        company_document_id=doc.id,
                        status=doc.status,
                        has_file=bool(doc.file_path),
                        original_filename=doc.original_filename,
                        uploaded_at=doc.uploaded_at,
                        uploaded_by_name=doc.uploaded_by.full_name if doc.uploaded_by else None,
                        due_date=doc.due_date or due_date,
                        validated_at=doc.validated_at,
                        validated_by_name=doc.validated_by.full_name if doc.validated_by else None,
                        rejection_reason=doc.rejection_reason,
                    ))
                else:
                    if not only_validated:
                        matrix.append(DocumentMatrixItem(
                            catalog_item_id=item.id,
                            code=item.code, name=item.name,
                            category=item.category, periodicity=item.periodicity,
                            period_label=period_label, period_display=period_display,
                            company_document_id=None,
                            status=DocumentStatusEnum.PENDIENTE,
                            has_file=False, due_date=due_date,
                        ))

    return matrix


def get_company_document_summary(
    db: Session, company: Company, year: Optional[int] = None
) -> CompanyDocumentSummary:
    matrix = get_document_matrix(db, company, year)
    counts = {status.value: 0 for status in DocumentStatusEnum}
    for row in matrix:
        counts[row.status.value] += 1
    return CompanyDocumentSummary(total=len(matrix), **counts)


def get_company_document(db: Session, document_id: int) -> Optional[CompanyDocument]:
    stmt = (
        select(CompanyDocument)
        .options(selectinload(CompanyDocument.catalog_item))
        .where(CompanyDocument.id == document_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def get_document_for_period(
    db: Session, company_id: int, catalog_item_id: int, period_label: Optional[str]
) -> Optional[CompanyDocument]:
    """Devuelve el documento existente para esa combinación, sin crearlo."""
    stmt = select(CompanyDocument).where(
        CompanyDocument.company_id == company_id,
        CompanyDocument.catalog_item_id == catalog_item_id,
        CompanyDocument.period_label == period_label,
    )
    return db.execute(stmt).scalar_one_or_none()


def _get_or_create_document(
    db: Session, company_id: int, catalog_item_id: int, period_label: Optional[str]
) -> CompanyDocument:
    stmt = select(CompanyDocument).where(
        CompanyDocument.company_id == company_id,
        CompanyDocument.catalog_item_id == catalog_item_id,
        CompanyDocument.period_label == period_label,
    )
    doc = db.execute(stmt).scalar_one_or_none()
    if doc is None:
        doc = CompanyDocument(
            company_id=company_id,
            catalog_item_id=catalog_item_id,
            period_label=period_label,
        )
        db.add(doc)
        db.flush()
    return doc


def upload_document(
    db: Session,
    company: Company,
    catalog_item: DocumentCatalogItem,
    period_label: Optional[str],
    filename: str,
    file_bytes: bytes,
    user,
) -> CompanyDocument:
    doc = _get_or_create_document(db, company.id, catalog_item.id, period_label)

    # Reemplaza el archivo anterior si existía
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass

    period_dir = period_label or "unico"
    dir_path = os.path.join(
        settings.UPLOAD_DIR, "companies", str(company.id), str(catalog_item.id), period_dir
    )
    os.makedirs(dir_path, exist_ok=True)

    ext = os.path.splitext(filename)[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(dir_path, stored_name)

    with open(full_path, "wb") as f:
        f.write(file_bytes)

    doc.file_path = full_path
    doc.original_filename = filename
    doc.uploaded_by_id = user.id
    doc.uploaded_at = datetime.now(timezone.utc)
    doc.status = DocumentStatusEnum.CARGADO
    doc.validated_by_id = None
    doc.validated_at = None
    doc.rejection_reason = None

    db.commit()
    db.refresh(doc)

    # Limpiar logs de alertas para que se reenvíen en el próximo ciclo
    try:
        from app.crud.document_alert import clear_alert_logs_for_document
        clear_alert_logs_for_document(db, doc.id)
    except Exception:
        pass  # No bloquear la carga si falla

    return doc


def validate_document(
    db: Session, document: CompanyDocument, approve: bool, reason: Optional[str], user
) -> CompanyDocument:
    if document.status != DocumentStatusEnum.CARGADO:
        raise ValueError("Solo se pueden validar documentos en estado 'cargado'")

    document.status = DocumentStatusEnum.VALIDADO if approve else DocumentStatusEnum.RECHAZADO
    document.validated_by_id = user.id
    document.validated_at = datetime.now(timezone.utc)
    document.rejection_reason = None if approve else (reason or "Rechazado sin motivo especificado")

    db.commit()
    db.refresh(document)
    return document


def delete_document_file(db: Session, document: CompanyDocument) -> CompanyDocument:
    if document.file_path and os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except OSError:
            pass

    document.file_path = None
    document.original_filename = None
    document.uploaded_by_id = None
    document.uploaded_at = None
    document.status = DocumentStatusEnum.PENDIENTE
    document.validated_by_id = None
    document.validated_at = None
    document.rejection_reason = None

    db.commit()
    db.refresh(document)
    return document