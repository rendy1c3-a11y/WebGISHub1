import urllib.request
import ssl
import json
import psycopg
from psycopg.rows import dict_row

DB_PARAMS = "host=127.0.0.1 port=5433 dbname=geoportal_db user=postgres"
GISHUB_OWS = "https://gishub.kemenhub.go.id/geoserver/ows"

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def fetch_gishub_geojson(typename: str, max_features: int = 500) -> dict:
    url = f"{GISHUB_OWS}?service=WFS&version=1.0.0&request=GetFeature&typename={typename}&outputFormat=json&maxFeatures={max_features}"
    print(f"Mengambil data dari GISHUB: {typename}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=get_ssl_context(), timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))

def is_valid_point_geom(geom_dict):
    if not geom_dict or not isinstance(geom_dict, dict):
        return False
    coords = geom_dict.get("coordinates")
    if not coords or not isinstance(coords, (list, tuple)) or len(coords) < 2:
        return False
    if coords[0] is None or coords[1] is None:
        return False
    return True

def sync_gishub_to_postgis():
    """
    Sinkronisasi layer transportasi utama dari GeoServer GISHUB Kemenhub
    ke dalam tabel spasial PostgreSQL + PostGIS lokal.
    """
    print("=== Memulai Sinkronisasi Data GISHUB ke PostGIS ===")
    
    with psycopg.connect(DB_PARAMS) as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        conn.commit()

        # 1. Pelabuhan Laut
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS gishub_pelabuhan (
                id SERIAL PRIMARY KEY,
                nama VARCHAR(255),
                kode VARCHAR(50),
                fcode VARCHAR(50),
                geom GEOMETRY(Point, 4326)
            );
            CREATE INDEX IF NOT EXISTS idx_gishub_pelabuhan_geom ON gishub_pelabuhan USING GIST(geom);
            TRUNCATE TABLE gishub_pelabuhan;
            """)
            try:
                data_pel = fetch_gishub_geojson("laut:PELABUHAN_PT_NEW", 300)
                saved = 0
                for f in data_pel.get("features", []):
                    geom_obj = f.get("geometry")
                    if not is_valid_point_geom(geom_obj):
                        continue
                    props = f.get("properties", {})
                    cur.execute("""
                    INSERT INTO gishub_pelabuhan (nama, kode, fcode, geom)
                    VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326));
                    """, (props.get("nama"), props.get("kode"), props.get("fcode"), json.dumps(geom_obj)))
                    saved += 1
                conn.commit()
                print(f"-> Berhasil menyimpan {saved} pelabuhan dari GISHUB.")
            except Exception as e:
                conn.rollback()
                print("-> Gagal sync pelabuhan:", e)

        # 2. Bandara
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS gishub_bandara (
                id SERIAL PRIMARY KEY,
                nama VARCHAR(255),
                iata VARCHAR(20),
                kota VARCHAR(100),
                provinsi VARCHAR(100),
                ident VARCHAR(20),
                geom GEOMETRY(Point, 4326)
            );
            CREATE INDEX IF NOT EXISTS idx_gishub_bandara_geom ON gishub_bandara USING GIST(geom);
            TRUNCATE TABLE gishub_bandara;
            """)
            try:
                data_arpt = fetch_gishub_geojson("udara:AIRPORT_PT", 300)
                saved = 0
                for f in data_arpt.get("features", []):
                    geom_obj = f.get("geometry")
                    if not is_valid_point_geom(geom_obj):
                        continue
                    props = f.get("properties", {})
                    cur.execute("""
                    INSERT INTO gishub_bandara (nama, iata, kota, provinsi, ident, geom)
                    VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326));
                    """, (props.get("name"), props.get("iata"), props.get("city"), props.get("PROV"), props.get("arpt_ident"), json.dumps(geom_obj)))
                    saved += 1
                conn.commit()
                print(f"-> Berhasil menyimpan {saved} bandara dari GISHUB.")
            except Exception as e:
                conn.rollback()
                print("-> Gagal sync bandara:", e)

        # 3. Stasiun Kereta Api
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS gishub_stasiun (
                id SERIAL PRIMARY KEY,
                nama VARCHAR(255),
                provinsi VARCHAR(100),
                kabkot VARCHAR(100),
                geom GEOMETRY(Point, 4326)
            );
            CREATE INDEX IF NOT EXISTS idx_gishub_stasiun_geom ON gishub_stasiun USING GIST(geom);
            TRUNCATE TABLE gishub_stasiun;
            """)
            try:
                data_stn = fetch_gishub_geojson("kereta:STASIUNKA_PT", 300)
                saved = 0
                for f in data_stn.get("features", []):
                    geom_obj = f.get("geometry")
                    if not is_valid_point_geom(geom_obj):
                        continue
                    props = f.get("properties", {})
                    cur.execute("""
                    INSERT INTO gishub_stasiun (nama, provinsi, kabkot, geom)
                    VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326));
                    """, (props.get("nama_stasi"), props.get("prov"), props.get("kabkot"), json.dumps(geom_obj)))
                    saved += 1
                conn.commit()
                print(f"-> Berhasil menyimpan {saved} stasiun KA dari GISHUB.")
            except Exception as e:
                conn.rollback()
                print("-> Gagal sync stasiun:", e)

        # 4. Kecelakaan Pelayaran
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS gishub_kecelakaan (
                id SERIAL PRIMARY KEY,
                nama_kapal VARCHAR(255),
                kategori VARCHAR(100),
                lokasi VARCHAR(255),
                perairan VARCHAR(150),
                tahun INT,
                geom GEOMETRY(Point, 4326)
            );
            CREATE INDEX IF NOT EXISTS idx_gishub_kecelakaan_geom ON gishub_kecelakaan USING GIST(geom);
            TRUNCATE TABLE gishub_kecelakaan;
            """)
            try:
                data_kc = fetch_gishub_geojson("laut:KECELAKAANPELAYARAN_PT", 300)
                saved = 0
                for f in data_kc.get("features", []):
                    geom_obj = f.get("geometry")
                    if not is_valid_point_geom(geom_obj):
                        continue
                    props = f.get("properties", {})
                    thn = props.get("tahun")
                    try:
                        thn = int(thn) if thn else None
                    except Exception:
                        thn = None
                    cur.execute("""
                    INSERT INTO gishub_kecelakaan (nama_kapal, kategori, lokasi, perairan, tahun, geom)
                    VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326));
                    """, (props.get("nama_kapal"), props.get("kategori"), props.get("lokasi"), props.get("perairan"), thn, json.dumps(geom_obj)))
                    saved += 1
                conn.commit()
                print(f"-> Berhasil menyimpan {saved} titik kecelakaan pelayaran dari GISHUB.")
            except Exception as e:
                conn.rollback()
                print("-> Gagal sync kecelakaan:", e)

        # 5. Sekolah Kedinasan
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS gishub_sekolah (
                id SERIAL PRIMARY KEY,
                nama VARCHAR(255),
                alamat TEXT,
                geom GEOMETRY(Point, 4326)
            );
            CREATE INDEX IF NOT EXISTS idx_gishub_sekolah_geom ON gishub_sekolah USING GIST(geom);
            TRUNCATE TABLE gishub_sekolah;
            """)
            try:
                data_sk = fetch_gishub_geojson("bpsdmp:SEKOLAH_PT", 100)
                saved = 0
                for f in data_sk.get("features", []):
                    geom_obj = f.get("geometry")
                    if not is_valid_point_geom(geom_obj):
                        continue
                    props = f.get("properties", {})
                    cur.execute("""
                    INSERT INTO gishub_sekolah (nama, alamat, geom)
                    VALUES (%s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326));
                    """, (props.get("NAMOBJ"), props.get("ALAMAT"), json.dumps(geom_obj)))
                    saved += 1
                conn.commit()
                print(f"-> Berhasil menyimpan {saved} sekolah kedinasan dari GISHUB.")
            except Exception as e:
                conn.rollback()
                print("-> Gagal sync sekolah kedinasan:", e)

    print("=== Sinkronisasi GISHUB ke PostGIS Selesai! ===")

if __name__ == "__main__":
    sync_gishub_to_postgis()
