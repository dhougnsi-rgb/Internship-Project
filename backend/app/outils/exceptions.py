"""
Custom exception classes for the DjoHealth API.
Provides consistent error handling and response formatting.
"""

from typing import Any, Optional

from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception for all API errors."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        self.error_code = error_code
        super().__init__(status_code=status_code, detail=detail, **kwargs)


class AuthenticationError(BaseAPIException):
    """Authentication related errors."""

    def __init__(self, detail: str = "Authentication failed", error_code: str = "AUTH_ERROR") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code=error_code,
        )


class AuthorizationError(BaseAPIException):
    """Authorization/permission related errors."""

    def __init__(self, detail: str = "Insufficient permissions", error_code: str = "AUTHORIZATION_ERROR") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code=error_code,
        )


class NotFoundError(BaseAPIException):
    """Resource not found errors."""

    def __init__(self, detail: str = "Resource not found", error_code: str = "NOT_FOUND") -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code=error_code,
        )


class ValidationError(BaseAPIException):
    """Validation errors for request data."""

    def __init__(self, detail: str = "Validation failed", error_code: str = "VALIDATION_ERROR") -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code=error_code,
        )


class ConflictError(BaseAPIException):
    """Conflict errors (e.g., duplicate resources)."""

    def __init__(self, detail: str = "Resource conflict", error_code: str = "CONFLICT_ERROR") -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code=error_code,
        )


class ServiceUnavailableError(BaseAPIException):
    """Service unavailable errors (e.g., external services down)."""

    def __init__(self, detail: str = "Service temporarily unavailable", error_code: str = "SERVICE_UNAVAILABLE") -> None:
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            error_code=error_code,
        )


class DatabaseError(BaseAPIException):
    """Database related errors."""

    def __init__(self, detail: str = "Database error occurred", error_code: str = "DATABASE_ERROR") -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code=error_code,
        )


class ExternalServiceError(BaseAPIException):
    """External service integration errors."""

    def __init__(self, detail: str = "External service error", error_code: str = "EXTERNAL_SERVICE_ERROR") -> None:
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
            error_code=error_code,
        )
