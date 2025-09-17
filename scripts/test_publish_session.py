# Local test for publish_session_lyrics function
from apps.server import main

print('Calling publish_session_lyrics with empty body (use latest session)')
res = main.publish_session_lyrics({})
print('Result:')
print(res)
