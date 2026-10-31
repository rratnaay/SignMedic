# Panduan Instalasi dan Menjalankan SignMedic (INSTALL.md)

Dokumen ini berisi panduan teknis langkah demi langkah untuk menyiapkan lingkungan pengembangan, menjalankan aplikasi web SignMedic, atau melatih ulang model Machine Learning.

Pilih skenario panduan sesuai dengan kebutuhan Anda:
* **Skenario A:** Menjalankan aplikasi web (Frontend, Papan Visual, Kamera BISINDO, Demo Triase).
* **Skenario B:** Mengembangkan atau melatih ulang model Machine Learning (Python).
* **Skenario C:** Melakukan *deployment* ke Vercel.

---

## Skenario A: Menjalankan Aplikasi Web (Frontend & Demo)

Jika Anda hanya ingin menjalankan atau menguji aplikasi web, Anda **tidak perlu menginstal Python atau mengunduh dataset video mentah**. Seluruh model TensorFlow.js dan aset MediaPipe yang siap pakai sudah tersedia di dalam direktori `web/public/models/`.

### 1. Prasyarat Sistem
* **Node.js:** Versi 18.x atau 20.x (LTS direkomendasikan).
* **npm:** Versi 9.x atau yang lebih baru (terpasang otomatis bersama Node.js).
* **Git:** Versi 2.30+.
* **Peramban Web:** Google Chrome, Microsoft Edge, atau Safari versi modern yang mendukung WebGL, WebAssembly, dan WebRTC.

### 2. Langkah Instalasi

1. **Clone Repositori:**
   ```bash
   git clone https://github.com/rratnaay/SignMedic.git
   cd SignMedic
   ```

2. **Masuk ke Direktori Web dan Pasang Dependensi:**
   ```bash
   cd web
   npm install
   ```
   *(Script `postinstall` akan otomatis menyalin aset WebAssembly MediaPipe ke folder `web/public/wasm/`)*.

3. **Jalankan Server Pengembangan Lokal:**
   ```bash
   npm run dev
   ```
   Buka peramban di alamat lokal yang tertera di terminal (biasanya `http://localhost:5173`).

4. **Menjalankan Pengujian (Testing):**
   Untuk memverifikasi keutuhan logika triase, ekstraksi fitur matematis, dan privasi client-side:
   ```bash
   npm run test
   ```
   Semua 37 skenario pengujian unit dan integrasi akan dieksekusi menggunakan Vitest.

5. **Membangun Berkas Produksi (Production Build):**
   ```bash
   npm run build
   ```
   Hasil kompilasi siap saji akan dibuat di direktori `web/dist/`.

---

## Skenario B: Mengembangkan / Melatih Ulang Model ML (Python)

Gunakan skenario ini jika Anda bertugas di bagian Machine Learning untuk mengolah data video gestur, melatih ulang model dengan validasi *Leave-One-Signer-Out* (LOSO), atau menguji coba deteksi gestur menggunakan Python.

### 1. Prasyarat Sistem
* **Python:** Versi 3.10 atau 3.11 (Python 3.11.x direkomendasikan).
* **Kamera / Webcam:** Diperlukan jika ingin menguji coba inferensi langsung di desktop via OpenCV (`test_webcam.py`).
* **Git:** Versi 2.30+.

### 2. Langkah Instalasi Lingkungan Virtual

1. **Masuk ke Folder `ml`:**
   ```bash
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

4. **Pasang Dependensi Pustaka:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Pastikan Model MediaPipe Tersedia:**
   Pastikan berkas `ml/hand_landmarker.task` ada di folder `ml/`. Jika belum ada, salin dari folder web:
   ```bash
   # Di Windows PowerShell:
   Copy-Item ..\web\public\models\hand_landmarker.task -Destination .\hand_landmarker.task
   ```

### 3. Menyiapkan Dataset Video
1. Letakkan seluruh berkas rekaman video gestur BISINDO format `.mp4` ke dalam folder `ml/data/raw/`.
2. Format penamaan berkas yang didukung:
   `signer<ID>_label<LABEL>_sample<SAMPLE>.mp4`

### 4. Menjalankan Pipeline Machine Learning

1. **Ekstraksi Landmark (FEATURE_SPEC v2.0.0):**
   ```bash
   python extract_landmarks.py
   ```
   Menghasilkan data terproses $T=30 \times 129$ fitur di `ml/data/processed/dataset.npz`.

2. **Pelatihan & Evaluasi Model (Clean Nested LOSO):**
   ```bash
   python train.py
   ```
   Model Keras tersimpan di `ml/final_model.h5`, laporan metrik dan matriks konfusi tersimpan di `ml/reports/`.

3. **Ekspor Model ke Format TensorFlow.js untuk Web:**
   ```bash
   python export_tfjs.py
   ```
   Model siap pakai otomatis diperbarui di direktori `web/public/models/`.

4. **Uji Coba Inferensi pada Berkas Video Tertentu:**
   ```bash
   python test_video.py --class_name "Makan"
   ```

---

## Skenario C: Deployment ke Vercel

Aplikasi web SignMedic telah dilengkapi dengan konfigurasi SPA rewrite dan *direct WebRTC P2P sync* sehingga siap dideploy ke Vercel:

1. Buat proyek baru di dashboard [Vercel](https://vercel.com/) dan tautkan dengan repositori GitHub Anda.
2. Pada menu konfigurasi proyek:
   * **Framework Preset:** `Vite`
   * **Root Directory:** Klik *Edit* lalu pilih direktori `web`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
   * **Install Command:** `npm install`
3. Klik tombol **Deploy**.
4. Setelah proses build selesai (~1 menit), aplikasi akan langsung aktif dan otomatis berjalan di protokol HTTPS yang aman untuk akses kamera dan mikrofon.
