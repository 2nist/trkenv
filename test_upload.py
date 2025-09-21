import requests
import time

files = {'file': open('runs/_recordings/93390c87_recording.webm', 'rb')}
response = requests.post('http://localhost:8000/recordings/upload', files=files)
print('Upload Status:', response.status_code)
if response.status_code == 200:
    data = response.json()
    job_id = data.get('jobId')
    print('Job ID:', job_id)
    
    # Wait for job to complete
    for i in range(20):
        status_response = requests.get(f'http://localhost:8000/jobs/{job_id}')
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f'Attempt {i+1}: {status_data.get("status")}')
            if status_data.get('status') == 'done':
                draft_id = status_data.get('draftId')
                print('Draft ID:', draft_id)
                break
        else:
            print(f'Attempt {i+1}: Error {status_response.status_code}')
        time.sleep(3)