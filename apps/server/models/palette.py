"""Backward-compatible palette shim.

This module re-exports the canonical models from `apps.server.models.canvas`
so existing imports like `from apps.server.models.palette import CanvasDoc` keep
working while we move forward with the `canvas` module name.
"""

from apps.server.models.canvas import CanvasDoc, XY, Size, Node, Group  # re-export

__all__ = ["CanvasDoc", "XY", "Size", "Node", "Group"]
