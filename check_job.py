import requests
import time

job_id = '9f11ecdd3404'
for i in range(15):
    response = requests.get(f'http://localhost:8000/jobs/{job_id}')
    if response.status_code == 200:
        data = response.json()
        print(f'Attempt {i+1}: {data.get("status")}')
        if data.get('status') == 'done':
            break
    else:
        print(f'Attempt {i+1}: Error {response.status_code}')
    time.sleep(2)