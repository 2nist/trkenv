"""Package marker for apps.server.models.

This file makes the `apps.server.models` directory a regular Python package
so imports like `from apps.server.models import palette` work when the
parent `apps.server` package defines an `__init__.py` (as it does).

It used to be a namespace directory which failed under some test runners
because `apps.server` is a regular package; adding this file restores
traditional package import semantics and fixes CI import errors.
"""

__all__ = [
    "core",
    "jobs",
    "lyrics",
    "palette",
    "songs",
    "themes",
    "timeline",
]
