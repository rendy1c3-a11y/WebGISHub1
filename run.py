import uvicorn
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    print("=" * 65)
    print("GISHUB WEBGIS TRANSPORTASI NASIONAL")
    print("Terkoneksi ke GeoServer GISHUB Kemenhub & PostgreSQL PostGIS")
    print("Akses WebGIS : http://localhost:8001")
    print("Dokumentasi  : http://localhost:8001/docs")
    print("=" * 65)
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8001, reload=True)
