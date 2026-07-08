source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

working pipeline in pipeline.py , then cached embeddings using sqlite3 later can implement ttl or lru on ebeding db
to get all apis :
http://127.0.0.1:8000/docs
GET : /



POST
<!-- stage 8 response + job id  -->
[/organize](http://127.0.0.1:8000/organize)
Organize


GET
<!-- this will give gemini response  -->
http://127.0.0.1:8000/job/{job_id}
Get Job Status