"""
Structured request/response logging middleware for DjoHealth API.
Logs method, path, status code, duration, and authenticated user.
"""

import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configure root logger format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

logger = logging.getLogger("djohealth.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every request with method, path, status code, and duration."""

    # Paths to skip (health/root checks generate too much noise)
    SKIP_PATHS = {"/", "/health", "/favicon.ico", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        # Log incoming request
        logger.info(
            "[%s] → %s %s",
            request_id,
            request.method,
            request.url.path,
        )

        try:
            response: Response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "[%s] ✗ %s %s — UNHANDLED ERROR after %.1fms: %s",
                request_id,
                request.method,
                request.url.path,
                duration_ms,
                str(exc),
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            level,
            "[%s] ← %s %s %d (%.1fms)",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        # Attach request-id to response for tracing
        response.headers["X-Request-ID"] = request_id
        return response
