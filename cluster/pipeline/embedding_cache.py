import hashlib
import sqlite3
from pathlib import Path
import numpy as np


# DB Config 

DB_PATH = Path("embedding_cache.db")

# init db

def init_db():
    connect =sqlite3.connect(DB_PATH)
    cursor = connect.cursor()
    cursor.execute(
        '''CREATE TABLE IF NOT EXISTS embeddings(
            cache_key TEXT PRIMARY KEY,
            embedding BLOB NOT NULL
        )''')
    
    connect.commit()
    connect.close()

#  cache key

def make_cache_key(embedding_text:str,model_name:str):
    ''' Creates a deterministic cache key .
        Same title + url + model
        always produces the same hash.
    '''

    text=f"{embedding_text}|{model_name}"

    return hashlib.sha256(text.encode("utf-8")).hexdigest()

# get embedding from cache

def get_embedding(cache_key:str):
    ''' To retrieve an embedding from cache '''

    conn= sqlite3.connect(DB_PATH)
    cursor=conn.cursor()

    cursor.execute("SELECT embedding FROM embeddings WHERE cache_key=?",(cache_key,))
    raw= cursor.fetchone()
    conn.close()
    if raw is None:
        return None
    else :
        return np.frombuffer(raw[0], dtype=np.float32)
    
# save embedding 
def save_embedding(cache_key:str,embedding:np.ndarray):
    conn= sqlite3.connect(DB_PATH)
    cursor=conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO embeddings (cache_key, embedding) VALUES (?, ?)", (cache_key,  embedding.astype(np.float32).tobytes(),))
    conn.commit()
    conn.close()

