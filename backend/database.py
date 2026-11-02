import psycopg
from psycopg.rows import dict_row
from contextlib import contextmanager

DB_PARAMS = "host=127.0.0.1 port=5433 dbname=geoportal_db user=postgres"

@contextmanager
def get_db():
    conn = psycopg.connect(DB_PARAMS, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()

def execute_query(sql: str, params: tuple = None) -> list:
    """Eksekusi query dan return list of dict"""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            try:
                return cur.fetchall()
            except Exception:
                return []

def query_geojson(sql: str, params: tuple = None) -> dict:
    """Eksekusi query SQL PostGIS mengembalikan GeoJSON FeatureCollection"""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            row = cur.fetchone()
            if row and row.get("geojson"):
                return row["geojson"]
            return {"type": "FeatureCollection", "features": []}
