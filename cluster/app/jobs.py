import threading
import uuid

_jobs = {}

_lock = threading.Lock()


def create_job():

    job_id = str(uuid.uuid4())

    with _lock:
        _jobs[job_id] = {
            "status": "processing",
            "tree": None,
        }

    return job_id


def complete_job(job_id, tree):

    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["status"] = "completed"
            _jobs[job_id]["tree"] = tree


def fail_job(job_id, error):

    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["status"] = "failed"
            _jobs[job_id]["error"] = str(error)


def get_job(job_id):

    with _lock:
        return _jobs.get(job_id)