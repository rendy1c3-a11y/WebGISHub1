@echo off
title Menjalankan WebGIS GISHUB dan PostGIS
echo ========================================================
echo   MENJALANKAN DATABASE POSTGIS & SERVER WEBGIS
echo ========================================================
echo.

:: 1. Cek & Bersihkan stale postmaster.pid jika ada
if exist "C:\Program Files\PostgreSQL\18\data\postmaster.pid" (
    echo [1/3] Menghapus file lock lama postmaster.pid...
    del /f /q "C:\Program Files\PostgreSQL\18\data\postmaster.pid" >nul 2>&1
)

:: 2. Jalankan PostgreSQL PostGIS di background jika belum jalan
echo [2/3] Menyalakan PostgreSQL 18 PostGIS (Port 5433)...
start "" /B "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "C:\Program Files\PostgreSQL\18\data"
timeout /t 3 /nobreak >nul

:: 3. Jalankan WebGIS GISHUB Kemenhub
echo [3/3] Menyalakan WebGIS GISHUB (Port 8001)...
cd /d "C:\Users\RENDI\.gemini\antigravity\scratch\webgis-gishub"
start "" http://localhost:8001
python run.py

pause
