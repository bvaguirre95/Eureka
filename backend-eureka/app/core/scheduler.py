"""
Scheduler de tareas periódicas para Eureka SST.
Usa APScheduler en modo BackgroundScheduler (thread independiente).

Tareas registradas:
  - expiry_alerts: diariamente a las 08:00, envía alertas de vencimiento documental.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _run_expiry_alerts_job() -> None:
    """Job ejecutado por el scheduler."""
    from app.database import SessionLocal
    from app.crud.document_alert import run_expiry_alerts

    db = SessionLocal()
    try:
        result = run_expiry_alerts(db)
        logger.info(
            f"[scheduler] expiry_alerts → sent={result['sent']} "
            f"skipped={result['skipped']} errors={result['errors']}"
        )
    except Exception as exc:
        logger.error(f"[scheduler] expiry_alerts falló: {exc}", exc_info=True)
    finally:
        db.close()


def start_scheduler() -> None:
    """Iniciar el scheduler. Llamar desde el lifespan de FastAPI."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone="America/Guayaquil")

    # Alertas de vencimiento: todos los días a las 08:00
    _scheduler.add_job(
        _run_expiry_alerts_job,
        trigger=CronTrigger(hour=8, minute=0),
        id="expiry_alerts",
        name="Alertas de vencimiento documental",
        replace_existing=True,
        misfire_grace_time=3600,  # tolera hasta 1h de retraso
    )

    _scheduler.start()
    logger.info("[scheduler] APScheduler iniciado — expiry_alerts a las 08:00 ECT")


def stop_scheduler() -> None:
    """Detener el scheduler al apagar la app."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[scheduler] APScheduler detenido")


def trigger_alerts_now() -> dict:
    """Ejecutar el job de alertas manualmente (para testing/admin)."""
    from app.database import SessionLocal
    from app.crud.document_alert import run_expiry_alerts
    db = SessionLocal()
    try:
        return run_expiry_alerts(db)
    finally:
        db.close()