import os
import threading
from app.jobs import complete_job, create_job, fail_job, get_job
from fastapi import FastAPI
from typing import Any,List ,Dict
from pipeline.embedding_cache import init_db
from pydantic import BaseModel
from pipeline.pipeline import run_tabmind_pipeline,serialize_tree,load_embedding_model,stage_9_refine_names
from contextlib import asynccontextmanager
api_key = os.getenv("GEMINI_API_KEY")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing cache...")
    init_db()
    print("Loading embedding model...")
    load_embedding_model()
    print("Embedding model loaded.")
    yield


def run_stage9(job_id, stage8, api_key):
    try:
        stage9 = stage_9_refine_names(
            stage8,
            api_key,
        )
        complete_job(
            job_id,
            serialize_tree(stage9),
        )
    except Exception as e:
        fail_job(
            job_id,
            e,
        )

app = FastAPI(
    title="Tab_MIND API",
    lifespan=lifespan,
)

@app.get('/')
def root():
    return {"message": "Hello, World!"}


class OrganizeRequest(BaseModel):
    tabs: List[Dict[str, Any]]

@app.post('/organize')
def organize(request: OrganizeRequest):
    tree = run_tabmind_pipeline(request.tabs)
    job_id = create_job()

    threading.Thread(
        target=run_stage9,
        args=(
            job_id,
            tree,
            api_key,
        ),
        daemon=True,
    ).start()

    return {
    "success": True,
    "jobId": job_id,
    "stage8": serialize_tree(tree),
}

@app.get("/job/{job_id}")
def get_job_status(job_id: str):

    job = get_job(job_id)

    if job is None:
        return {
            "success": False,
            "message": "Job not found"
        }

    return job