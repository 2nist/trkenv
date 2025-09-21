import sqlite3

conn = sqlite3.connect('trk.db')
c = conn.cursor()

# Get all tables
c.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = c.fetchall()
print("Tables:", [t[0] for t in tables])

# Check if songs table exists
if any('songs' in t[0] for t in tables):
    c.execute('SELECT id, title FROM songs LIMIT 5')
    songs = c.fetchall()
    print("Songs:", songs)

conn.close()