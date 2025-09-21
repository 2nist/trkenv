"""Compatibility helpers for Pydantic v1/v2 differences.

Provides a single `model_to_dict` helper that will call `model_dump()` if
available (Pydantic v2) or fall back to `dict()` (Pydantic v1).
"""
from typing import Any


def model_to_dict(obj: Any, **kwargs) -> Any:
    """Convert a Pydantic model (or a plain object) into a serializable dict.

    Extra kwargs are forwarded to the underlying conversion method.
    """
    # Prefer v2 name
    try:
        md = getattr(obj, "model_dump")
        return md(**kwargs)
    except Exception:
        pass
    # Fallback to v1
    try:
        d = getattr(obj, "dict")
        return d(**kwargs)
    except Exception:
        return obj
