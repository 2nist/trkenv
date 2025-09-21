"""Canvas (palette) Pydantic models.

This module contains the canonical models for the palette/canvas editor.
We keep a separate module so the public name can be changed later without
breaking imports; `palette.py` will re-export these types for compatibility.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class XY(BaseModel):
    """A 2D position."""
    x: float = 0.0
    y: float = 0.0


class Size(BaseModel):
    w: int = 0
    h: int = 0


class Node(BaseModel):
    """A node entry in the canvas palette."""
    id: str
    feature: Optional[str] = None
    component: Optional[str] = None
    variant: Optional[str] = None
    position: Optional[XY] = None
    size: Optional[Size] = None
    props_overrides: Optional[Dict[str, Any]] = Field(default_factory=dict)
    style_overrides: Optional[Dict[str, Any]] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)


class Group(BaseModel):
    id: str
    name: Optional[str] = None
    nodes: List[str] = Field(default_factory=list)


class CanvasDoc(BaseModel):
    """Top-level canvas document stored in the palettes DB column.

    Keeps minimal defaults so the server can create a new canvas without
    requiring the frontend to send every field.
    """
    id: str
    experiment_id: Optional[str] = None
    name: str = "Untitled"
    nodes: List[Node] = Field(default_factory=list)
    groups: List[Group] = Field(default_factory=list)
    grid_size: int = 8
    snap: bool = True
    zoom: float = 1.0
    viewport: Dict[str, Any] = Field(default_factory=dict)
    meta: Dict[str, Any] = Field(default_factory=dict)


# --- Request/patch helper models used by the API ---
class PaletteCreate(BaseModel):
    name: Optional[str] = None
    experiment_id: Optional[str] = None


class PalettePatch(BaseModel):
    name: Optional[str] = None
    experiment_id: Optional[str] = None
    grid_size: Optional[int] = None
    snap: Optional[bool] = None
    zoom: Optional[float] = None
    viewport: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None
    nodes: Optional[List[Node]] = None
    groups: Optional[List[Group]] = None


class NodeCreate(BaseModel):
    id: Optional[str] = None
    feature: Optional[str] = None
    component: Optional[str] = None
    variant: Optional[str] = None
    position: Optional[XY] = None
    size: Optional[Size] = None
    props_overrides: Optional[Dict[str, Any]] = None
    style_overrides: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class NodePatch(BaseModel):
    feature: Optional[str] = None
    component: Optional[str] = None
    variant: Optional[str] = None
    position: Optional[XY] = None
    size: Optional[Size] = None
    props_overrides: Optional[Dict[str, Any]] = None
    style_overrides: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class RestoreRequest(BaseModel):
    ts: Optional[str] = None
    path: Optional[str] = None
