import os
import json
import ssl
import urllib.request
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from .database import get_db, query_geojson, execute_query

app = FastAPI(
    title="GISHUB Kemenhub WebGIS API",
    description="WebGIS API terhubung langsung ke GISHUB Kementerian Perhubungan & PostGIS",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
GISHUB_OWS = "https://gishub.kemenhub.go.id/geoserver/ows"

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

@app.get("/api/health")
def health_check():
    """Cek koneksi ke PostGIS lokal dan server GISHUB Kemenhub."""
    gishub_status = "offline"
    try:
        req = urllib.request.Request(f"{GISHUB_OWS}?service=WMS&version=1.1.1&request=GetCapabilities", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=5) as res:
            if res.getcode() == 200:
                gishub_status = "online"
    except Exception:
        pass

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT PostGIS_Version();")
                postgis_ver = cur.fetchone()["postgis_version"]
                
                # Hitung records hasil sync
                counts = {}
                tables = [
                    ("pelabuhan", "gishub_pelabuhan"),
                    ("bandara", "gishub_bandara"),
                    ("stasiun", "gishub_stasiun"),
                    ("kecelakaan", "gishub_kecelakaan"),
                    ("sekolah", "gishub_sekolah"),
                    ("provinsi", "gishub_provinsi"),
                    ("kawasan_pelabuhan", "gishub_kawasan_pelabuhan"),
                    ("kawasan_bandara", "gishub_kawasan_bandara"),
                    ("kawasan_stasiun", "gishub_kawasan_stasiun"),
                    ("kawasan_penyeberangan", "gishub_kawasan_penyeberangan")
                ]
                for label, tbl in tables:
                    try:
                        cur.execute(f"SELECT count(*) as count FROM {tbl};")
                        counts[label] = cur.fetchone()["count"]
                    except Exception:
                        counts[label] = 0

                return {
                    "status": "connected",
                    "gishub_geoserver": gishub_status,
                    "postgis_version": postgis_ver,
                    "synced_counts": counts
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# DAFTAR LENGKAP 24 DATASET GISHUB KEMENHUB (Sesuai Katalog Resmi & Gambar)
GISHUB_24_DATASETS = [
    {
        "id": "penunjang_adm_prov_ar",
        "title": "Batas Wilayah Provinsi",
        "layer_name": "penunjang:adm_prov_ar",
        "category": "Batas Wilayah",
        "type": "Polygon",
        "color": "#38bdf8",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=penunjang:adm_prov_ar&STYLE=adm_prov_ar",
        "active": True,
        "postgis_table": "provinsi",
        "description": "Batas poligon administratif 38 provinsi di seluruh Indonesia."
    },
    {
        "id": "laut_sbnp_p_pt",
        "title": "Peta Sebaran SBNP Sungai, Danau & Penyeberangan",
        "layer_name": "laut:SBNP_P_PT",
        "category": "Laut",
        "type": "Point",
        "color": "#f59e0b",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=laut:SBNP_P_PT",
        "active": False,
        "description": "Sarana Bantu Navigasi Pelayaran (SBNP) sungai, danau, dan lintas penyeberangan."
    },
    {
        "id": "laut_alurpelayaranlaut_ln",
        "title": "Peta Alur Pelayaran Laut",
        "layer_name": "laut:ALURPELAYARANLAUT_LN",
        "category": "Laut",
        "type": "LineString",
        "color": "#2563eb",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=laut:ALURPELAYARANLAUT_LN",
        "active": True,
        "description": "Koridor alur pelayaran laut resmi navigasi kapal di perairan Indonesia."
    },
    {
        "id": "laut_pelabuhan_ar",
        "title": "Peta Kawasan Pelabuhan Umum",
        "layer_name": "laut:PELABUHAN_AR",
        "category": "Laut",
        "type": "Polygon",
        "color": "#0284c7",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=laut:PELABUHAN_AR&STYLE=PELABUHAN_AR",
        "active": False,
        "postgis_table": "kawasan_pelabuhan",
        "description": "Poligon batas kawasan daratan & perairan pelabuhan umum."
    },
    {
        "id": "laut_kecelakaanpelayaran_pt",
        "title": "Peta Sebaran Kecelakaan Pelayaran",
        "layer_name": "laut:KECELAKAANPELAYARAN_PT",
        "category": "Laut",
        "type": "Point",
        "color": "#ef4444",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=laut:KECELAKAANPELAYARAN_PT",
        "active": True,
        "postgis_table": "kecelakaan",
        "description": "Catatan historis insiden kecelakaan kapal (terbakar, tenggelam, tubrukan, kandas)."
    },
    {
        "id": "intram_perlengkapanjln_pt",
        "title": "Peta Sebaran Perlengkapan Jalan",
        "layer_name": "intram:PERLENGKAPANJLN_PT",
        "category": "Darat",
        "type": "Point",
        "color": "#f97316",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=intram:PERLENGKAPANJLN_PT",
        "active": False,
        "description": "Fasilitas dan perlengkapan keselamatan jalan raya."
    },
    {
        "id": "intram_atcs_pt",
        "title": "Peta Sebaran Area Traffic Control System (ATCS)",
        "layer_name": "intram:ATCS_PT",
        "category": "Darat",
        "type": "Point",
        "color": "#ec4899",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=intram:ATCS_PT",
        "active": False,
        "description": "Sebaran sistem kendali lalu lintas berbasis teknologi cerdas."
    },
    {
        "id": "intram_halte_pt",
        "title": "Peta Sebaran Halte Bus",
        "layer_name": "intram:HALTE_PT",
        "category": "Darat",
        "type": "Point",
        "color": "#14b8a6",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=intram:HALTE_PT",
        "active": False,
        "description": "Titik pemberhentian dan halte angkutan umum bus."
    },
    {
        "id": "bpsdmp_sekolah_pt",
        "title": "Peta Sebaran Sekolah Kedinasan Kemenhub",
        "layer_name": "bpsdmp:SEKOLAH_PT",
        "category": "Pendidikan",
        "type": "Point",
        "color": "#eab308",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=bpsdmp:SEKOLAH_PT",
        "active": True,
        "postgis_table": "sekolah",
        "description": "Perguruan tinggi kedinasan transportasi (Politeknik, STIP, PIP, PTDI-STTD)."
    },
    {
        "id": "kereta_stasiunka_ar",
        "title": "Peta Kawasan Prasarana Stasiun Kereta Api",
        "layer_name": "kereta:STASIUNKA_AR",
        "category": "Perkeretaapian",
        "type": "Polygon",
        "color": "#10b981",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=kereta:STASIUNKA_AR&STYLE=STASIUNKA_AR",
        "active": False,
        "postgis_table": "kawasan_stasiun",
        "description": "Poligon kawasan tapak dan prasarana stasiun kereta api."
    },
    {
        "id": "kereta_gudang_pt",
        "title": "Peta Sebaran Prasarana Gudang Kereta Api",
        "layer_name": "kereta:GUDANG_PT",
        "category": "Perkeretaapian",
        "type": "Point",
        "color": "#059669",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=kereta:GUDANG_PT",
        "active": False,
        "description": "Sebaran fasilitas gudang logistik angkutan kereta api."
    },
    {
        "id": "kereta_depoka_pt",
        "title": "Peta Sebaran Prasarana Depo Kereta Api",
        "layer_name": "kereta:DEPOKA_PT",
        "category": "Perkeretaapian",
        "type": "Point",
        "color": "#047857",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=kereta:DEPOKA_PT",
        "active": False,
        "description": "Fasilitas depo perawatan dan penyimpanan lokomotif serta gerbong."
    },
    {
        "id": "kereta_catudaya_pt",
        "title": "Peta Sebaran Prasarana Catudaya Kereta Api",
        "layer_name": "kereta:CATUDAYA_PT",
        "category": "Perkeretaapian",
        "type": "Point",
        "color": "#065f46",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=kereta:CATUDAYA_PT",
        "active": False,
        "description": "Prasarana gardu dan catudaya listrik jalur kereta api listrik."
    },
    {
        "id": "kereta_balaiyasa_pt",
        "title": "Peta Sebaran Balai Yasa Kereta Api",
        "layer_name": "kereta:BALAIYASA_PT",
        "category": "Perkeretaapian",
        "type": "Point",
        "color": "#0f766e",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=kereta:BALAIYASA_PT",
        "active": False,
        "description": "Bengkel besar perawatan akhir sarana perkeretaapian."
    },
    {
        "id": "udara_airport_ar",
        "title": "Peta Kawasan Bandar Udara",
        "layer_name": "udara:AIRPORT_AR",
        "category": "Udara",
        "type": "Polygon",
        "color": "#8b5cf6",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=udara:AIRPORT_AR&STYLE=AIRPORT_AR",
        "active": False,
        "postgis_table": "kawasan_bandara",
        "description": "Poligon kawasan batas lahan bandar udara."
    },
    {
        "id": "darat_penyeberangan_ar",
        "title": "Peta Kawasan Pelabuhan Penyeberangan",
        "layer_name": "darat:PENYEBERANGAN_AR",
        "category": "Darat",
        "type": "Polygon",
        "color": "#d97706",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=darat:PENYEBERANGAN_AR&STYLE=PENYEBERANGAN_AR",
        "active": False,
        "postgis_table": "kawasan_penyeberangan",
        "description": "Poligon kawasan pelabuhan penyeberangan ASDP."
    },
    {
        "id": "kereta_angkutanbarang_ln",
        "title": "Trayek Angkutan Kereta Api Barang",
        "layer_name": "kereta:ANGKUTANBARANG_LN",
        "category": "Perkeretaapian",
        "type": "LineString",
        "color": "#115e59",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=kereta:ANGKUTANBARANG_LN",
        "active": False,
        "description": "Rute jaringan rel khusus angkutan logistik dan barang."
    },
    {
        "id": "udara_rutepenerbangan_ln",
        "title": "Trayek Angkutan Udara (Rute Penerbangan)",
        "layer_name": "udara:RUTEPENERBANGAN_LN",
        "category": "Udara",
        "type": "LineString",
        "color": "#a855f7",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=udara:RUTEPENERBANGAN_LN",
        "active": False,
        "description": "Rute jaringan penerbangan domestik dan internasional."
    },
    {
        "id": "laut_pelabuhan_pt_new",
        "title": "Peta Sebaran Pelabuhan Umum",
        "layer_name": "laut:PELABUHAN_PT_NEW",
        "category": "Laut",
        "type": "Point",
        "color": "#0ea5e9",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=laut:PELABUHAN_PT_NEW",
        "active": True,
        "postgis_table": "pelabuhan",
        "description": "Titik sebaran pelabuhan laut komersial dan rakyat."
    },
    {
        "id": "udara_airport_pt",
        "title": "Peta Sebaran Bandara Udara",
        "layer_name": "udara:AIRPORT_PT",
        "category": "Udara",
        "type": "Point",
        "color": "#7c3aed",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=udara:AIRPORT_PT",
        "active": True,
        "postgis_table": "bandara",
        "description": "Titik lokasi bandar udara internasional, domestik, dan perintis."
    },
    {
        "id": "darat_pelabuhan_sd_pt",
        "title": "Peta Sebaran Pelabuhan Sungai dan Danau",
        "layer_name": "darat:PELABUHAN_SD_PT",
        "category": "Darat",
        "type": "Point",
        "color": "#0284c7",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=darat:PELABUHAN_SD_PT",
        "active": False,
        "description": "Dermaga dan pelabuhan angkutan sungai serta danau pedalaman."
    },
    {
        "id": "laut_vts_pt",
        "title": "Peta Sebaran Vessel Traffic Service (VTS)",
        "layer_name": "laut:VTS_PT",
        "category": "Laut",
        "type": "Point",
        "color": "#3b82f6",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=laut:VTS_PT",
        "active": False,
        "description": "Stasiun radar Vessel Traffic Service pemantau lalu lintas laut."
    },
    {
        "id": "laut_alurplayar_ln",
        "title": "Peta Alur Pelayaran Masuk Pelabuhan",
        "layer_name": "laut:ALURPLAYAR_LN",
        "category": "Laut",
        "type": "LineString",
        "color": "#1d4ed8",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=laut:ALURPLAYAR_LN",
        "active": False,
        "description": "Garis alur masuk perairan menuju kolam dermaga pelabuhan."
    },
    {
        "id": "laut_sbnp_pt",
        "title": "Peta Sebaran Sarana Bantu Navigasi Pelayaran (SBNP)",
        "layer_name": "laut:SBNP_PT",
        "category": "Laut",
        "type": "Point",
        "color": "#ca8a04",
        "wms_url": GISHUB_OWS,
        "legend_url": f"{GISHUB_OWS}?service=WMS&request=GetLegendGraphic&format=image/png&WIDTH=20&HEIGHT=20&LAYER=laut:SBNP_PT",
        "active": False,
        "description": "Menara suar, rambu suar, dan pelampung suar navigasi pelayaran."
    }
]

@app.get("/api/gishub/catalog")
def get_gishub_catalog():
    """Mengembalikan daftar lengkap 24 dataset GISHUB Kemenhub."""
    return GISHUB_24_DATASETS

@app.get("/api/gishub/geojson/{table_name}")
def get_gishub_layer_geojson(table_name: str, limit: int = 500):
    """
    Mengambil data vektor geospasial hasil sinkronisasi GISHUB dari PostGIS
    dalam format GeoJSON FeatureCollection.
    Mendukung poligon kawasan dan batas provinsi.
    """
    valid_tables = {
        "pelabuhan": ("gishub_pelabuhan", "Point"),
        "bandara": ("gishub_bandara", "Point"),
        "stasiun": ("gishub_stasiun", "Point"),
        "kecelakaan": ("gishub_kecelakaan", "Point"),
        "sekolah": ("gishub_sekolah", "Point"),
        "provinsi": ("gishub_provinsi", "Polygon"),
        "kawasan_pelabuhan": ("gishub_kawasan_pelabuhan", "Polygon"),
        "kawasan_bandara": ("gishub_kawasan_bandara", "Polygon"),
        "kawasan_stasiun": ("gishub_kawasan_stasiun", "Polygon"),
        "kawasan_penyeberangan": ("gishub_kawasan_penyeberangan", "Polygon")
    }
    cfg = valid_tables.get(table_name)
    if not cfg:
        raise HTTPException(status_code=400, detail="Tabel tidak ditemukan")

    tbl, geom_type = cfg

    # Untuk polygon provinsi, kita bisa simplifikasi sedikit agar sangat cepat ditransfer ke Leaflet
    if table_name == "provinsi":
        geom_expr = "ST_AsGeoJSON(ST_Simplify(geom, 0.005))::jsonb"
    else:
        geom_expr = "ST_AsGeoJSON(geom)::jsonb"

    sql = f"""
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
            jsonb_build_object(
                'type', 'Feature',
                'id', id,
                'geometry', {geom_expr},
                'properties', to_jsonb(t) - 'geom' || jsonb_build_object('layer_type', '{table_name}')
            )
        ), '[]'::jsonb)
    ) AS geojson
    FROM (SELECT * FROM {tbl} LIMIT {limit}) t;
    """
    return query_geojson(sql)

@app.get("/api/gishub/wfs-proxy")
def proxy_wfs_geojson(typename: str, max_features: int = 250):
    """Proxy dinamis ke GISHUB GeoServer WFS untuk layer apapun."""
    url = f"{GISHUB_OWS}?service=WFS&version=1.0.0&request=GetFeature&typename={typename}&outputFormat=json&maxFeatures={max_features}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as res:
            data = json.loads(res.read().decode("utf-8"))
            return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengambil WFS dari GISHUB: {str(e)}")

@app.get("/api/spatial/accidents-near-port")
def get_accidents_near_port(port_id: int, radius_km: float = 100.0):
    """
    POSTGIS SPATIAL QUERY: ST_DWithin & ST_Distance
    Mencari titik kecelakaan pelayaran yang terjadi dalam radius tertentu
    dari pelabuhan yang dipilih, dihitung akurat dengan PostGIS Geodetic/Geography.
    """
    sql = """
    WITH selected_port AS (
        SELECT id, nama, geom FROM gishub_pelabuhan WHERE id = %s
    )
    SELECT 
        p.id AS port_id,
        p.nama AS port_name,
        ST_X(p.geom) as port_lon,
        ST_Y(p.geom) as port_lat,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', k.id,
                'nama_kapal', k.nama_kapal,
                'kategori', k.kategori,
                'lokasi', k.lokasi,
                'tahun', k.tahun,
                'jarak_km', ROUND((ST_Distance(p.geom::geography, k.geom::geography) / 1000)::numeric, 1),
                'lon', ST_X(k.geom),
                'lat', ST_Y(k.geom)
            ) ORDER BY ST_Distance(p.geom::geography, k.geom::geography)
        ) FILTER (WHERE k.id IS NOT NULL), '[]'::jsonb) AS accidents_list
    FROM selected_port p
    LEFT JOIN gishub_kecelakaan k
        ON ST_DWithin(p.geom::geography, k.geom::geography, %s * 1000)
    GROUP BY p.id, p.nama, p.geom;
    """
    res = execute_query(sql, (port_id, radius_km))
    if not res:
        raise HTTPException(status_code=404, detail="Pelabuhan tidak ditemukan")
    return res[0]

@app.get("/api/gishub/stats")
def get_stats():
    """Agregasi statistik sarana & prasarana transportasi Indonesia."""
    try:
        sql_kc = """
        SELECT kategori, count(*) as count
        FROM gishub_kecelakaan
        WHERE kategori IS NOT NULL AND kategori <> ''
        GROUP BY kategori
        ORDER BY count DESC
        LIMIT 6;
        """
        kc_stats = execute_query(sql_kc)

        sql_arpt = """
        SELECT COALESCE(provinsi, 'Lainnya') as provinsi, count(*) as count
        FROM gishub_bandara
        WHERE provinsi IS NOT NULL AND provinsi <> ''
        GROUP BY provinsi
        ORDER BY count DESC
        LIMIT 5;
        """
        arpt_stats = execute_query(sql_arpt)

        sql_totals = """
        SELECT 
            (SELECT count(*) FROM gishub_pelabuhan) as total_pelabuhan,
            (SELECT count(*) FROM gishub_bandara) as total_bandara,
            (SELECT count(*) FROM gishub_stasiun) as total_stasiun,
            (SELECT count(*) FROM gishub_kecelakaan) as total_kecelakaan,
            (SELECT count(*) FROM gishub_sekolah) as total_sekolah,
            (SELECT count(*) FROM gishub_provinsi) as total_provinsi,
            (SELECT count(*) FROM gishub_kawasan_pelabuhan) as total_kawasan_pelabuhan,
            (SELECT count(*) FROM gishub_kawasan_bandara) as total_kawasan_bandara;
        """
        totals = execute_query(sql_totals)[0]

        return {
            "totals": totals,
            "accident_categories": kc_stats,
            "airports_by_prov": arpt_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend belum dibuat"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=True)
