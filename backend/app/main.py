import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

from app.api.v1.preliminary import router as preliminary_router
from app.api.v1.rotation import router as rotation_router
from app.api.v1.routes import router
from app.core.config import Settings
from app.core.errors import ApiError
from app.db.session import make_sessions

logger = logging.getLogger("agronexa")


def error_response(status: int, code: str, message: str, details=None, headers=None):
    return JSONResponse(
        status_code=status,
        content={"code": code, "message": message, "details": details},
        headers=headers,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    logger.setLevel(settings.log_level)
    api = FastAPI(title="AgroNexa", version="0.1.0")
    api.state.settings = settings
    api.state.sessions = make_sessions(settings.database_url)
    api.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
    )
    api.include_router(router)
    api.include_router(rotation_router)
    api.include_router(preliminary_router)

    @api.exception_handler(ApiError)
    async def handle_api_error(_, exc: ApiError):
        return error_response(exc.status, exc.code, exc.message)

    @api.exception_handler(RequestValidationError)
    async def handle_validation_error(_, exc: RequestValidationError):
        fields = [".".join(map(str, error["loc"])) for error in exc.errors()]
        return error_response(422, "invalid_input", "Revisa los parámetros de la consulta.", fields)

    @api.exception_handler(HTTPException)
    async def handle_http_error(_, exc: HTTPException):
        message = {404: "Ruta no encontrada.", 405: "Método no permitido."}.get(
            exc.status_code,
            "No se pudo procesar la solicitud.",
        )
        return error_response(exc.status_code, "http_error", message, headers=exc.headers)

    @api.exception_handler(SQLAlchemyError)
    async def handle_db_error(_, exc: SQLAlchemyError):
        logger.error("Error de base de datos (%s).", type(exc).__name__)
        return error_response(503, "database_unavailable", "La base de datos no está disponible.")

    @api.exception_handler(Exception)
    async def handle_internal_error(_, exc: Exception):
        logger.error("Error interno (%s).", type(exc).__name__)
        return error_response(500, "internal_error", "Ocurrió un error interno.")

    @api.get("/health")
    def health(request: Request):
        with request.app.state.sessions() as session:
            session.execute(text("SELECT 1 FROM locations WHERE 1 = 0"))
        return {"status": "ok", "database": "ok"}

    return api


app = create_app()
