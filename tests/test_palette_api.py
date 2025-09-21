from fastapi.testclient import TestClient
from apps.server.main import app


def test_palette_full_cycle(tmp_path):
    client = TestClient(app)

    # Create palette
    r = client.post('/api/palettes', json={'name': 'API Canvas', 'experiment_id': 'audio-engine'})
    assert r.status_code == 200
    j = r.json()
    pid = j['id']

    # Get palette
    gr = client.get(f'/api/palettes/{pid}')
    assert gr.status_code == 200
    assert 'ETag' in gr.headers

    # Add a node
    node = {'feature': 'kick', 'component': 'Button', 'position': {'x': 1, 'y': 2}}
    nr = client.post(f'/api/palettes/{pid}/nodes', json=node)
    assert nr.status_code == 200
    created = nr.json()
    nid = created.get('id')
    assert nid

    # Patch node: use latest ETag (node creation may have updated the palette)
    etag = nr.headers.get('ETag') or gr.headers.get('ETag')
    pr = client.patch(f'/api/palettes/{pid}/nodes/{nid}', json={'position': {'x': 10, 'y': 20}}, headers={'If-Match': etag})
    assert pr.status_code == 200
    patched = pr.json()
    assert patched.get('position', {}).get('x') == 10

    # Snapshot
    sr = client.post(f'/api/palettes/{pid}/snapshot')
    assert sr.status_code == 200
    snap = sr.json().get('snapshot')
    assert snap and snap.get('ts')

    # List snapshots
    lr = client.get(f'/api/palettes/{pid}/snapshots')
    assert lr.status_code == 200
    snaps = lr.json().get('items')
    assert isinstance(snaps, list) and snaps

    # Restore
    rr = client.post(f'/api/palettes/{pid}/restore', json={'ts': snap['ts']})
    assert rr.status_code == 200

    # Delete node
    dr = client.delete(f'/api/palettes/{pid}/nodes/{nid}')
    assert dr.status_code == 200

    # Delete palette
    dr2 = client.delete(f'/api/palettes/{pid}')
    assert dr2.status_code == 200


def test_palette_edge_cases():
    client = TestClient(app)

    # Create palette without name -> default name used
    r = client.post('/api/palettes', json={})
    assert r.status_code == 200
    j = r.json(); pid = j['id']
    assert j.get('name')

    # Try patch with stale ETag -> expect 409 (use an explicit bogus ETag to avoid timing race)
    conflict = client.patch(f'/api/palettes/{pid}', json={'zoom': 3.0}, headers={'If-Match': 'bogus-stale-etag'})
    assert conflict.status_code == 409

    # Restore missing params -> bad request
    bad = client.post(f'/api/palettes/{pid}/restore', json={})
    assert bad.status_code == 400

    # Patch non-existent node -> 404
    notfound = client.patch(f'/api/palettes/{pid}/nodes/doesnotexist', json={'position': {'x': 1}})
    assert notfound.status_code == 404

    # Snapshot list limit/offset sanity
    # Create a couple snapshots
    client.post(f'/api/palettes/{pid}/snapshot')
    client.post(f'/api/palettes/{pid}/snapshot')
    listing = client.get(f'/api/palettes/{pid}/snapshots?limit=1&offset=0')
    assert listing.status_code == 200
    data = listing.json()
    assert data.get('limit') == 1 and isinstance(data.get('items'), list)

    # Cleanup
    client.delete(f'/api/palettes/{pid}')
