import time, json
from pathlib import Path
from fastapi.testclient import TestClient
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from apps.server import main

client = TestClient(main.app)


def test_palette_crud_and_snapshot(tmp_path: Path):
    # create
    r = client.post('/api/palettes', json={'name':'My Canvas','experiment_id':'audio-engine'})
    assert r.status_code == 200
    pal = r.json(); pid = pal['id']

    # list
    r = client.get('/api/palettes')
    assert r.status_code == 200
    items = r.json().get('items', [])
    assert any(it['id'] == pid for it in items)

    # get doc (capture ETag)
    gr = client.get(f'/api/palettes/{pid}')
    assert gr.status_code == 200
    etag = gr.headers.get('ETag')
    doc = gr.json()
    assert doc['name'] == 'My Canvas'
    assert doc['experiment_id'] == 'audio-engine'

    # add node
    n = {
        'feature':'panel','component':'Chart','variant':'line',
        'position': {'x': 10, 'y': 20}, 'size': {'w': 320, 'h': 200},
        'props_overrides': {'title':'Hello'}, 'style_overrides': {'color':'red'},
        'tags': ['demo']
    }
    nr = client.post(f'/api/palettes/{pid}/nodes', json=n)
    assert nr.status_code == 200
    node = nr.json(); nid = node['id']
    assert node['component'] == 'Chart'

    # patch node
    pr = client.patch(f'/api/palettes/{pid}/nodes/{nid}', json={'position': {'x': 15, 'y': 25}}, headers={'If-Match': etag or ''})
    assert pr.status_code == 200
    new_etag = pr.headers.get('ETag')
    assert pr.json()['position']['x'] == 15

    # snapshot
    sr = client.post(f'/api/palettes/{pid}/snapshot')
    assert sr.status_code == 200
    snap = sr.json()['snapshot']

    # snapshot list
    lr = client.get(f'/api/palettes/{pid}/snapshots')
    assert lr.status_code == 200
    snaps = lr.json().get('items', [])
    assert any(s['ts'] == snap['ts'] for s in snaps)

    # restore from snapshot
    rr = client.post(f'/api/palettes/{pid}/restore', json={'ts': snap['ts']})
    assert rr.status_code == 200
    assert rr.headers.get('ETag') is not None

    # conflict on stale ETag
    cr = client.patch(f'/api/palettes/{pid}', json={'zoom': 1.1}, headers={'If-Match': 'bogus-stale-etag'})
    assert cr.status_code in (409, 412)

    # delete node
    dr = client.delete(f'/api/palettes/{pid}/nodes/{nid}')
    assert dr.status_code == 200

    # delete palette
    dr2 = client.delete(f'/api/palettes/{pid}')
    assert dr2.status_code == 200

    # 404 after delete
    r404 = client.get(f'/api/palettes/{pid}')
    assert r404.status_code == 404
