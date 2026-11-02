@echo off
title Upload WebGIS ke GitHub
echo ========================================================
echo   MENGUPLOAD WEBGIS KE REPOSITORI GITHUB
echo   Repo: https://github.com/rendy1c3-a11y/WebGISHub1.git
echo ========================================================
echo.
cd /d "C:\Users\RENDI\.gemini\antigravity\scratch\webgis-gishub"

echo Melakukan push ke GitHub...
"C:\Users\RENDI\git-portable\cmd\git.exe" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   BERHASIL DIUPLOAD KE GITHUB!
    echo ========================================================
    echo.
    echo Langkah berikutnya untuk mengaktifkan Website Publik:
    echo 1. Buka: https://github.com/rendy1c3-a11y/WebGISHub1/settings/pages
    echo 2. Pada bagian Branch, pilih "main" dan folder "/ (root)"
    echo 3. Klik "Save"
    echo 4. Website akan langsung aktif di:
    echo    https://rendy1c3-a11y.github.io/WebGISHub1/
    echo ========================================================
) else (
    echo.
    echo [GAGAL] Push memerlukan izin login GitHub di jendela browser Anda.
)

pause
