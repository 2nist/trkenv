from apps.server.models.canvas import CanvasDoc, Node


def test_canvasdoc_defaults_and_roundtrip():
    # Create a minimal CanvasDoc and ensure defaults are present
    doc = CanvasDoc(id="p1", name="My Canvas")
    assert doc.name == "My Canvas"
    assert isinstance(doc.nodes, list) and len(doc.nodes) == 0
    assert isinstance(doc.groups, list) and len(doc.groups) == 0

    # Add a node and round-trip to dict/json-compatible structure
    n = Node(id="n1")
    doc.nodes.append(n)
    d = doc.model_dump()
    assert d["id"] == "p1"
    assert isinstance(d["nodes"][0]["id"], str)

    # Reconstruct from dict
    doc2 = CanvasDoc(**d)
    assert doc2.id == doc.id
    assert len(doc2.nodes) == 1
