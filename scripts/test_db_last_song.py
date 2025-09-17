import sqlite3

DB='datasets/library/songs.db'
conn=sqlite3.connect(DB)
cur=conn.cursor()
cur.execute('SELECT id, title, source_json FROM songs ORDER BY rowid DESC LIMIT 1')
r=cur.fetchone()
print('latest song row:', r)
conn.close()
