import json

from fastapi.testclient import TestClient

from apps.server.main import app


def test_palette_etag_conflict_flow():
    client = TestClient(app)

    # Create a palette
    resp = client.post("/api/palettes", json={"name": "ETag Test"})
    assert resp.status_code == 200
    payload = resp.json()
    pid = payload.get("id")
    assert pid, "expected palette id from create"

    # Get the palette and its ETag
    resp = client.get(f"/api/palettes/{pid}")
    assert resp.status_code == 200
    etag1 = resp.headers.get("ETag")
    assert etag1, "expected ETag header on GET"

    # Patch using the fresh ETag - should succeed
    resp = client.patch(f"/api/palettes/{pid}", headers={"If-Match": etag1}, json={"name": "Renamed 1"})
    assert resp.status_code == 200
    etag2 = resp.headers.get("ETag")

    # The server uses second-resolution timestamps for ETag. If etag didn't change
    # (fast test run), perform an extra unconditional patch (or sleep) to advance
    # the updated_at value so we can simulate a true stale ETag conflict.
    if etag2 == etag1:
        # Do an unconditional PATCH to bump updated_at
        resp = client.patch(f"/api/palettes/{pid}", json={"name": "Renamed 1b"})
        assert resp.status_code == 200
        etag2 = resp.headers.get("ETag")
        if etag2 == etag1:
            # As a last resort, sleep a second and try again
            import time
            time.sleep(1.1)
            resp = client.patch(f"/api/palettes/{pid}", json={"name": "Renamed 1c"})
            assert resp.status_code == 200
            etag2 = resp.headers.get("ETag")

    assert etag2 and etag2 != etag1

    # Attempt patch with the old (stale) ETag - should return 409 Conflict
    resp = client.patch(f"/api/palettes/{pid}", headers={"If-Match": etag1}, json={"name": "Renamed 2"})
    assert resp.status_code == 409
    body = resp.json()
    # detail message should indicate conflict
    assert "conflict" in json.dumps(body).lower()
