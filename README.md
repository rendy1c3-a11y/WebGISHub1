# WebGIS Transportasi Nasional - GISHUB Kemenhub (24 Dataset Lokal)

Aplikasi WebGIS interaktif berbasis **24 Dataset Geospasial Lengkap GISHUB (Simpul Transportasi) Kementerian Perhubungan Republik Indonesia** yang tersimpan secara lokal di repository dalam format GeoJSON standar.

🌐 **Website Live (GitHub Pages):** [https://rendy1c3-a11y.github.io/WebGISHub1/](https://rendy1c3-a11y.github.io/WebGISHub1/)

---

## 🚀 Fitur Utama

1. **100% Akses Data Lokal Repo**:
   - Seluruh 24 layer dataset disimpan langsung di dalam direktori `data/*.geojson` di repository GitHub.
   - Tidak memerlukan koneksi live WMS/WFS ke server luar sehingga bebas timeout, bebas limitasi CORS, dan sangat cepat dimuat.
2. **Visualisasi Kartografi Bersih**:
   - **Simbol Titik Bulat**: Seluruh titik transportasi laut, udara, darat, dan kereta api dirender menggunakan marker lingkaran bulat presisi (`L.circleMarker`) dengan border kontras putih.
   - **Bebas Kotak Fokus**: Saat poligon batas provinsi atau kawasan diklik, kotak hitam bawaan browser dihilangkan secara otomatis.
   - **Layer Garis Terstruktur**: Alur pelayaran laut, rute penerbangan, dan rel KA barang dirender dengan styling warna tematik dan efek hover interaktif.
3. **Analisis Spasial Jarak (Buffer Geodesic)**:
   - Menghitung jarak jangkau insiden kecelakaan kapal di sekitar pelabuhan acuan menggunakan formula geodetik Haversine secara instan langsung di browser.
   - Dilengkapi visualisasi radius lingkaran buffer, highlight marker insiden, daftar tabel insiden terdekat, dan tombol reset satu-klik.
4. **Dashboard Statistik & Checklist Mandiri**:
   - Menampilkan KPI total sarana transportasi nasional.
   - Dilengkapi checklist toggle mandiri untuk menampilkan/menyembunyikan bagian statistik Kapal, Bandara, Kereta Api, dan SDM secara terpisah.
   - Grafik Donat untuk kategori kecelakaan kapal & Grafik Batang untuk sebaran bandara terbanyak per provinsi.
5. **Tabel Atribut Fitur Interaktif**:
   - Drawer tabel di bagian bawah untuk menelusuri data tabular dan fitur tombol "Zoom" langsung ke koordinat objek.

---

## 📁 Daftar 24 Dataset Lokal di Repository (`data/`)

| No | Layer ID | Nama Dataset | Tipe Geometri | Kategori |
|---|---|---|---|---|
| 1 | `penunjang_adm_prov_ar` | Batas Wilayah Provinsi | Polygon | Batas Wilayah |
| 2 | `laut_sbnp_p_pt` | Peta Sebaran SBNP Sungai, Danau & Penyeberangan | Point | Laut & SDP |
| 3 | `laut_alurpelayaranlaut_ln` | Alur Pelayaran Laut | LineString | Laut |
| 4 | `laut_pelabuhan_ar` | Kawasan Pelabuhan Laut | Polygon | Laut |
| 5 | `laut_kecelakaanpelayaran_pt` | Sebaran Kecelakaan Kapal Pelayaran | Point | Laut |
| 6 | `intram_perlengkapanjln_pt` | Perlengkapan Jalan Nasional | Point | Darat |
| 7 | `intram_atcs_pt` | Lokasi ATCS (Area Traffic Control System) | Point | Darat |
| 8 | `intram_halte_pt` | Peta Sebaran Halte Bus | Point | Darat |
| 9 | `bpsdmp_sekolah_pt` | Sekolah Tinggi Kedinasan BPSDMP | Point | SDM |
| 10 | `kereta_stasiunka_ar` | Kawasan Stasiun Kereta Api | Polygon | Perkeretaapian |
| 11 | `kereta_gudang_pt` | Gudang Logistik Kereta Api | Point | Perkeretaapian |
| 12 | `kereta_depoka_pt` | Lokasi Depo Kereta Api | Point | Perkeretaapian |
| 13 | `kereta_catudaya_pt` | Gardu & Catudaya Listrik Kereta | Point | Perkeretaapian |
| 14 | `kereta_balaiyasa_pt` | Balai Yasa Kereta Api | Point | Perkeretaapian |
| 15 | `udara_airport_ar` | Kawasan Bandar Udara | Polygon | Udara |
| 16 | `darat_penyeberangan_ar` | Kawasan Pelabuhan Penyeberangan | Polygon | Darat |
| 17 | `kereta_angkutanbarang_ln` | Jalur Kereta Api Angkutan Barang | LineString | Perkeretaapian |
| 18 | `udara_rutepenerbangan_ln` | Rute Jaringan Penerbangan Udara | LineString | Udara |
| 19 | `laut_pelabuhan_pt_new` | Peta Sebaran Pelabuhan Laut | Point | Laut |
| 20 | `udara_airport_pt` | Peta Sebaran Bandar Udara | Point | Udara |
| 21 | `darat_pelabuhan_sd_pt` | Peta Sebaran Pelabuhan Sungai dan Danau | Point | Darat |
| 22 | `laut_vts_pt` | Vessel Traffic Services (VTS) Pelayaran | Point | Laut |
| 23 | `laut_alurplayar_ln` | Alur Pelayaran Tradisional & Perintis | LineString | Laut |
| 24 | `laut_sbnp_pt` | Sarana Bantu Navigasi Pelayaran (SBNP) | Point | Laut |

---

## 🛠️ Cara Menjalankan Secara Lokal

### Opsi 1: Tanpa Instalasi Apa pun (Static Web Server)
Cukup jalankan web server sederhana berbasis Python:
```bash
python -m http.server 8000
```
Buka di browser: `http://localhost:8000`

### Opsi 2: Menggunakan Backend FastAPI + PostGIS
Klik ganda file:
```text
START_WEBGIS.bat
```
Aplikasi akan otomatis menyalakan PostgreSQL PostGIS dan server backend di `http://localhost:8001`.
