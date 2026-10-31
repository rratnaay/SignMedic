@echo off
setlocal enabledelayedexpansion
title SignMedic - Pasang Library Python dan Dataset 100% Offline
echo ===================================================================
echo     SignMedic - Kit Instalasi Python Offline (Tanpa Kuota Internet)
echo ===================================================================
echo.

:: 1. Cari lokasi folder SignMedic_Offline_Packages di semua drive
set SOURCE_PACKAGES=""

if exist "%~dp0SignMedic_Offline_Packages\site-packages" (
    set SOURCE_PACKAGES=%~dp0SignMedic_Offline_Packages
) else (
    for %%D in (D E F G H I J K) do (
        if exist "%%D:\SignMedic_Offline_Packages\site-packages" (
            set SOURCE_PACKAGES=%%D:\SignMedic_Offline_Packages
        )
    )
)

if "%SOURCE_PACKAGES%"=="" (
    echo [ERROR] Folder "SignMedic_Offline_Packages" tidak ditemukan di harddisk/flashdisk manapun!
    echo Pastikan harddisk eksternal Anda tetap tercolok di laptop.
    echo.
    pause
    exit /b
)

echo Ditemukan data offline di: %SOURCE_PACKAGES%
echo.

:: 2. Pastikan berada di dalam folder "ml" proyek SignMedic
if not exist "test_webcam.py" (
    if exist "ml\test_webcam.py" (
        cd ml
    ) else if exist "..\ml\test_webcam.py" (
        cd ..\ml
    ) else (
        echo [PETUNJUK PENTING]
        echo Salin file PASANG_OFFLINE.bat ini ke dalam folder "ml" di repositori laptop Anda,
        echo lalu klik 2x dari dalam folder tersebut.
        echo.
        echo Contoh lokasi yang benar: C:\Users\NamaAnda\SignMedic\ml\
        echo.
        pause
        exit /b
    )
)

echo Bekerja pada direktori proyek: %CD%
echo.

:: 3. Periksa Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python tidak terdeteksi di PATH!
    echo Pastikan Python 3.10 atau 3.11 sudah terpasang di laptop ini
    echo dan centang opsi "Add Python to PATH" saat menginstal Python.
    echo.
    pause
    exit /b
)

echo Python terdeteksi:
python --version
echo.

:: 4. Buat virtual environment (.venv)
echo [1/3] Membuat virtual environment lokal (.venv)...
if not exist ".venv" (
    python -m venv .venv
    if !errorlevel! neq 0 (
        echo [ERROR] Gagal membuat .venv.
        pause
        exit /b
    )
) else (
    echo Folder .venv sudah ada, melewati pembuatan ulang.
)

:: 5. Salin pustaka Python
echo.
echo [2/3] Menyalin pustaka (TensorFlow, OpenCV, MediaPipe) dari harddisk...
robocopy "%SOURCE_PACKAGES%\site-packages" ".venv\Lib\site-packages" /E /MT:8 /R:1 /W:1 /NFL /NDL /NP

:: 6. Salin dataset video
echo.
echo [3/3] Menyalin dataset video ke folder data\raw...
if not exist "data\raw" mkdir data\raw
robocopy "%SOURCE_PACKAGES%\raw_videos" "data\raw" /E /MT:8 /R:1 /W:1 /NFL /NDL /NP

:: 7. Verifikasi
echo.
echo Memverifikasi instalasi...
.\.venv\Scripts\python.exe -c "import cv2, mediapipe, tf_keras; print('VERIFIKASI BERHASIL: OpenCV, MediaPipe, dan TensorFlow siap digunakan!')"

if %errorlevel% equ 0 (
    echo.
    echo ===================================================================
    echo   [SUKSES] Semua library dan video berhasil dipasang 100%% offline!
    echo.
    echo   Sekarang Anda bisa langsung mencoba:
    echo     .\.venv\Scripts\python.exe test_webcam.py
    echo     .\.venv\Scripts\python.exe test_video.py --class_name "Makan"
    echo ===================================================================
) else (
    echo.
    echo [CATATAN] Ada kendala saat verifikasi. Pastikan versi Python Anda adalah 3.10 atau 3.11 64-bit.
)

echo.
pause
