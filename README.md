# WebGIS Transportasi Nasional - Integrasi GISHUB Kemenhub & PostGIS

Aplikasi WebGIS interaktif yang terhubung langsung dengan **GISHUB (Simpul Transportasi)** Kementerian Perhubungan Republik Indonesia ([https://gishub.kemenhub.go.id/](https://gishub.kemenhub.go.id/)) dan mesin database spasial **PostgreSQL 18 + PostGIS 3.6**.

Proyek ini dibangun berdasarkan dataset geospasial resmi Kemenhub yang tertera pada katalog GISHUB (seperti yang terlihat pada tangkapan layar):
- 🚢 **Transportasi Laut**: Alur Pelayaran Laut (`laut:ALURPELAYARANLAUT_LN`), Pelabuhan Umum (`laut:PELABUHAN_PT_NEW`), Sarana Bantu Navigasi Pelayaran (SBNP), Kawasan Pelabuhan, Sebaran Kecelakaan Pelayaran (`laut:KECELAKAANPELAYARAN_PT`).
- ✈️ **Transportasi Udara**: Sebaran Bandara Udara (`udara:AIRPORT_PT`) dan Rute Penerbangan.
- 🚆 **Perkeretaapian**: Sebaran Stasiun Kereta Api (`kereta:STASIUNKA_PT`), Prasarana Gudang/Depo KA, dan Jaringan Rel KA.
- 🚌 **Transportasi Darat**: Terminal Tipe A (`darat:TERMINAL_PT`), ATCS, Halte Bus, Perlengkapan Jalan.
- 🎓 **BPSDMP / SDM**: Sebaran Sekolah Kedinasan Kemenhub (`bpsdmp:SEKOLAH_PT`).
- 🗺️ **Batas Administrasi**: Batas Wilayah Provinsi (`penunjang:adm_prov_ar`).

---

## 🌟 Fitur Utama

1. **Koneksi OGC Langsung ke GISHUB GeoServer**:
   - **OGC WMS (Web Map Service):** Rendering cepat alur pelayaran dan batas wilayah langsung dari GeoServer Kemenhub (`https://gishub.kemenhub.go.id/geoserver/ows`).
   - **OGC WFS & GeoJSON:** Data fitur tabular dan spasial dapat diinspeksi per objek.
   - **Legenda Dinamis Resmi:** Menampilkan simbol dan styling resmi dari `GetLegendGraphic` GISHUB Kemenhub.
2. **PostGIS 3.6 Real-Time Spatial Engine**:
   - Query geodetik akurat `ST_DWithin` dan `ST_Distance`.
   - Analisis buffer jarak interaktif: Mencari titik insiden kecelakaan laut dalam radius tertentu dari pelabuhan acuan.
3. **Panel Kontrol Interaktif**:
   - Filter layer berdasarkan moda transportasi (Laut, Udara, Kereta, Darat, SDM).
   - Pengatur transparansi (*opacity slider*) per layer.
   - Drawer Detail Fitur saat titik atau garis diklik.
   - Drawer Tabel Data Atribut di bagian bawah layar.
4. **Dashboard Multimoda (Chart.js)**:
   - Diagram rekapitulasi kategori kecelakaan kapal (Tenggelam, Terbakar, Tubrukan, Kandas).
   - Grafik sebaran bandara per provinsi di Indonesia.
5. **Basemap Switcher**:
   - CartoDB Dark (Default modern).
   - Esri World Imagery (Citra Satelit).
   - OpenStreetMap.

---

## 🚀 Cara Menjalankan

Aplikasi saat ini telah **aktif berjalan** di:
- **WebGIS Interaktif**: [http://localhost:8001](http://localhost:8001)
- **Swagger API Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)

Untuk menjalankan ulang aplikasi secara manual:
```bash
cd "C:\Users\RENDI\.gemini\antigravity\scratch\webgis-gishub"
python run.py
```

Untuk menyinkronkan ulang data dari GISHUB ke PostGIS:
```bash
python backend\gishub_sync.py
```
