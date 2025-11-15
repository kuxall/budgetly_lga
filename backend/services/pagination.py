"""Pagination utilities for API endpoints."""

from typing import List, Dict, Any, TypeVar, Generic
from math import ceil

T = TypeVar('T')


class PaginationParams:
    """Pagination parameters."""

    def __init__(self, page: int = 1, page_size: int = 50, max_page_size: int = 100):
        """
        Initialize pagination parameters.

        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page
            max_page_size: Maximum allowed page size
        """
        self.page = max(1, page)
        self.page_size = min(max(1, page_size), max_page_size)
        self.skip = (self.page - 1) * self.page_size
        self.limit = self.page_size


class PaginatedResponse(Generic[T]):
    """Paginated response wrapper."""

    def __init__(
        self,
        items: List[T],
        total: int,
        page: int,
        page_size: int
    ):
        """
        Create paginated response.

        Args:
            items: List of items for current page
            total: Total number of items
            page: Current page number
            page_size: Items per page
        """
        self.items = items
        self.total = total
        self.page = page
        self.page_size = page_size
        self.total_pages = ceil(total / page_size) if page_size > 0 else 0
        self.has_next = page < self.total_pages
        self.has_prev = page > 1

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response."""
        return {
            "items": self.items,
            "pagination": {
                "total": self.total,
                "page": self.page,
                "page_size": self.page_size,
                "total_pages": self.total_pages,
                "has_next": self.has_next,
                "has_prev": self.has_prev
            }
        }


def paginate_list(
    items: List[T],
    page: int = 1,
    page_size: int = 50
) -> PaginatedResponse[T]:
    """
    Paginate a list of items.

    Args:
        items: List to paginate
        page: Page number (1-indexed)
        page_size: Items per page

    Returns:
        PaginatedResponse with paginated items
    """
    params = PaginationParams(page, page_size)
    total = len(items)

    # Slice the list for current page
    start = params.skip
    end = start + params.limit
    page_items = items[start:end]

    return PaginatedResponse(
        items=page_items,
        total=total,
        page=params.page,
        page_size=params.page_size
    )


def get_pagination_params(
    page: int = None,
    page_size: int = None,
    default_page_size: int = 50
) -> PaginationParams:
    """
    Get pagination parameters from query params.

    Args:
        page: Page number from query
        page_size: Page size from query
        default_page_size: Default page size if not provided

    Returns:
        PaginationParams object
    """
    page = page if page is not None else 1
    page_size = page_size if page_size is not None else default_page_size

    return PaginationParams(page, page_size)
