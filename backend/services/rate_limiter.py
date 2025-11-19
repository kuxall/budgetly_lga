"""Rate limiting service for API endpoints."""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter."""

    def __init__(self):
        # Store: {identifier: [(timestamp, count)]}
        self.requests: Dict[str, list] = defaultdict(list)
        self.cleanup_interval = 3600  # Clean up old entries every hour
        self.last_cleanup = datetime.now()

    def _cleanup_old_entries(self):
        """Remove old entries to prevent memory bloat."""
        now = datetime.now()
        if (now - self.last_cleanup).seconds < self.cleanup_interval:
            return

        cutoff = now - timedelta(hours=24)
        for identifier in list(self.requests.keys()):
            self.requests[identifier] = [
                (ts, count) for ts, count in self.requests[identifier]
                if ts > cutoff
            ]
            if not self.requests[identifier]:
                del self.requests[identifier]

        self.last_cleanup = now

    def check_rate_limit(
        self,
        identifier: str,
        max_requests: int,
        window_seconds: int
    ) -> Tuple[bool, int, int]:
        """
        Check if request is within rate limit.

        Args:
            identifier: Unique identifier (e.g., IP address, user ID)
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds

        Returns:
            Tuple of (is_allowed, remaining_requests, retry_after_seconds)
        """
        self._cleanup_old_entries()

        now = datetime.now()
        window_start = now - timedelta(seconds=window_seconds)

        # Get requests within the current window
        recent_requests = [
            (ts, count) for ts, count in self.requests[identifier]
            if ts > window_start
        ]

        # Calculate total requests in window
        total_requests = sum(count for _, count in recent_requests)

        if total_requests >= max_requests:
            # Rate limit exceeded
            oldest_request = min(ts for ts, _ in recent_requests)
            retry_after = int(
                (oldest_request + timedelta(seconds=window_seconds) - now).total_seconds())
            return False, 0, max(retry_after, 1)

        # Allow request and record it
        self.requests[identifier] = recent_requests + [(now, 1)]
        remaining = max_requests - total_requests - 1

        return True, remaining, 0

    def reset(self, identifier: str):
        """Reset rate limit for an identifier."""
        if identifier in self.requests:
            del self.requests[identifier]


# Global rate limiter instance
rate_limiter = RateLimiter()


def get_client_identifier(request) -> str:
    """Get unique identifier for rate limiting."""
    # Try to get real IP from headers (for proxies)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"
