import requests

job_id = '9f11ecdd3404'
response = requests.get(f'http://localhost:8000/api/jobs/{job_id}/artifacts')
if response.status_code == 200:
    data = response.json()
    print('Artifacts:')
    for item in data.get('items', []):
        print(f'  {item["name"]}: {item["size"]} bytes')
else:
    print('Error:', response.status_code, response.text)