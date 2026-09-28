"""
Error handler middleware for consistent error responses across the API.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.outils.exceptions import (
    AuthenticationError,
    AuthorizationError,
    BaseAPIException,
    ConflictError,
    DatabaseError,
    ExternalServiceError,
    NotFoundError,
    ServiceUnavailableError,
    ValidationError,
)


async def base_api_exception_handler(request: Request, exc: BaseAPIException) -> JSONResponse:
    """Handle custom API exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
            "path": str(request.url.path),
        },
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle SQLAlchemy database errors."""
    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=409,
            content={
                "detail": "Database integrity violation - resource may already exist",
                "error_code": "INTEGRITY_ERROR",
                "path": str(request.url.path),
            },
        )
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Database operation failed",
            "error_code": "DATABASE_ERROR",
            "path": str(request.url.path),
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred",
            "error_code": "INTERNAL_ERROR",
            "path": str(request.url.path),
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    """Register all error handlers with the FastAPI app."""
    # Custom API exceptions
    app.add_exception_handler(BaseAPIException, base_api_exception_handler)
    
    # Database exceptions
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    
    # Generic exception handler (should be last)
    app.add_exception_handler(Exception, generic_exception_handler)
