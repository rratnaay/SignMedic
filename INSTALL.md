# Panduan Instalasi dan Menjalankan SignMedic (INSTALL.md)

Dokumen ini berisi panduan langkah demi langkah bagi pengembang atau anggota tim yang baru melakukan *clone* repositori SignMedic.

Pilih skenario instalasi sesuai kebutuhan Anda:
* **Skenario A:** Menjalankan aplikasi web (Frontend, Papan Visual, Pengujian UI, Demo).
* **Skenario B:** Mengembangkan atau melatih ulang model Machine Learning (Python).

--

## Skenario A: Menjalankan Aplikasi Web (Frontend / Demo)

Jika Anda hanya ingin menjalankan atau menguji aplikasi web, Anda **TIDAK PERLU menginstal Python atau mengunduh dataset video**. Model TensorFlow.js dan MediaPipe task yang siap pakai sudah tersimpan di `web/public/models/` dan terlacak di Git.

### Opsi Alternatif: Instalasi 100% Offline via Harddisk (Tanpa Internet)

Jika koneksi internet lambat atau kuota terbatas, gunakan kit offline yang sudah disiapkan di harddisk eksternal:
1. Colokkan harddisk eksternal (yang berisi folder `SignMedic_Offline_Packages`).
2. Masuk ke folder `ml/` di laptop Anda.
3. Jalankan skrip:
   ```cmd
   PASANG_OFFLINE.bat
   ```
   *(Atau klik 2x berkas `PASANG_OFFLINE.bat` dari File Explorer).*
4. Skrip akan otomatis mendeteksi drive harddisk eksternal, membuat `.venv`, menyalin seluruh pustaka (TensorFlow, MediaPipe, OpenCV), dan menyalin video dataset tanpa kuota internet sama sekali.

---

### 1. Prasyarat Sistem
* Git
* Node.js versi 18 atau 20 (LTS)
* npm (otomatis terpasang bersama Node.js)

### 2. Langkah Instalasi

1. **Clone Repositori:**
   ```bash
   git clone <URL_REPOSITORI_SIGNMEDIC>
   cd SignMedic
   ```

2. **Masuk ke Direktori Web dan Pasang Dependensi:**
   ```bash
   cd web
   npm install
   ```

3. **Jalankan Server Pengembangan Lokal:**
   ```bash
   npm run dev
   ```
   Buka peramban (browser) di alamat yang muncul di terminal (biasanya `http://localhost:5173`).

4. **Menjalankan Pengujian Unit & Paritas (Opsional):**
   ```bash
   npm run test
   ```

---

## Skenario B: Mengembangkan / Melatih Ulang Model ML (Python)

Jika Anda bertugas di bagian Machine Learning untuk mengolah data, melatih ulang model dengan Leave-One-Signer-Out (LOSO), atau menguji video rekaman secara offline di Python:

### Opsi Alternatif: Instalasi 100% Offline via Harddisk (Tanpa Internet)

Jika koneksi internet lambat atau kuota terbatas, gunakan kit offline yang sudah disiapkan di harddisk eksternal:
1. Colokkan harddisk eksternal (yang berisi folder `SignMedic_Offline_Packages`).
2. Masuk ke folder `ml/` di laptop Anda.
3. Jalankan skrip:
   ```cmd
   PASANG_OFFLINE.bat
   ```
   *(Atau klik 2x berkas `PASANG_OFFLINE.bat` dari File Explorer).*
4. Skrip akan otomatis mendeteksi drive harddisk eksternal, membuat `.venv`, menyalin seluruh pustaka (TensorFlow, MediaPipe, OpenCV), dan menyalin video dataset tanpa kuota internet sama sekali.

---

### 1. Prasyarat Sistem
* Python versi 3.10 atau 3.11 (Direkomendasikan Python 3.11.x)
* Git

### 2. Langkah Instalasi

1. **Clone Repositori dan Masuk ke Folder `ml`:**
   ```bash
   git clone <URL_REPOSITORI_SIGNMEDIC>
   cd SignMedic/ml
   ```

2. **Buat Lingkungan Virtual (*Virtual Environment*):**
   ```bash
   python -m venv .venv
   ```

3. **Aktifkan Lingkungan Virtual:**
   * Di Windows (PowerShell):
     ```powershell
     .\.venv\Scripts\activate
     ```
   * Di Windows (Command Prompt):
     ```cmd
     .venv\Scripts\activate.bat
     ```
   * Di macOS / Linux:
     ```bash
     source .venv/bin/activate
     ```

4. **Pasang Dependensi Python:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Verifikasi Berkas Model MediaPipe:**
   Pastikan berkas `ml/hand_landmarker.task` ada. Jika belum ada, salin dari direktori web:
   ```bash
   # Dari direktori root SignMedic
   cp web/public/models/hand_landmarker.task ml/hand_landmarker.task
   ```

### 3. Menyiapkan Dataset Video (Kaggle)
Karena berkas video mentah berukuran besar, direktori `ml/data/raw/` diabaikan oleh `.gitignore`.
1. Unduh dataset video **WL-BISINDO** dari Kaggle.
2. Ekstrak seluruh berkas video `.mp4` ke dalam folder `ml/data/raw/`.
   Format nama berkas yang diharapkan: `signer<ID>_label<LABEL>_sample<SAMPLE>.mp4`.

### 4. Menjalankan Alur Kerja ML

* **Ekstraksi Landmark (FEATURE_SPEC v2.0.0):**
  ```bash
  python extract_landmarks.py
  ```
  *(Menghasilkan dataset terproses di `ml/data/processed/dataset.npz`)*

* **Pelatihan Model & Evaluasi Clean Nested LOSO:**
  ```bash
  python train.py
  ```
  *(Model Keras tersimpan di `ml/final_model.h5`, laporan metrik tersimpan di `ml/reports/metrics.json` dan `ml/reports/confusion_matrix.png`)*

* **Ekspor Model ke Format TensorFlow.js untuk Web:**
  ```bash
  python export_tfjs.py
  ```
  *(Model web diperbarui di `web/public/models/`)*

* **Membuat Uji Paritas Fitur ML-Web:**
  ```bash
  python make_parity_fixture.py
  ```
  *(Memperbarui `ml/parity_fixture.json` dan `web/src/__tests__/parity_fixture.json`)*

* **Menguji Coba Model pada Berkas Video Tertentu:**
  ```bash
  # Uji kata tertentu secara acak
  python test_video.py --class_name "Makan"

  # Uji berkas video spesifik
  python test_video.py --video "data/raw/signer0_label7_sample1.mp4"
  ```

---

## Ringkasan Struktur Folder Utama

```text
SignMedic/
  ├── INSTALL.md            <- Panduan instalasi ini
  ├── README.md             <- Deskripsi umum & arsitektur proyek
  ├── DESIGN.md             <- Acuan visual, tata letak, dan perilaku UI
  ├── AGENTS.md             <- Petunjuk dan aturan untuk AI coding agent
  ├── ml/                   <- Sumber daya Machine Learning (Python)
  │   ├── FEATURE_SPEC.md   <- Spesifikasi matematis ekstraksi fitur
  │   ├── extract_landmarks.py
  │   ├── train.py
  │   ├── export_tfjs.py
  │   ├── test_video.py
  │   ├── requirements.txt
  │   └── reports/          <- Hasil metrik akurasi & matriks konfusi
  └── web/                  <- Sumber daya aplikasi Web (React + TS + TF.js)
      ├── public/models/    <- Model TF.js siap pakai
      ├── shared/           <- Katalog pesan triase (catalog.json)
      └── src/              <- Komponen UI, state reducer, & test
```
