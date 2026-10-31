# SignMedic (Prototipe Jembatan Komunikasi Triase BISINDO)

> **PERNYATAAN BATASAN:**  
> Aplikasi ini adalah **alat bantu komunikasi awal** untuk memfasilitasi komunikasi antara pasien Tuli pengguna BISINDO dan tenaga kesehatan di meja triase. Aplikasi ini **BUKAN perangkat medis** dan **TIDAK melakukan diagnosis, penentuan kegawatan klinis, atau pemberian saran terapi**.

---

## 1. Struktur Repositori

```text
signmedic/
  ml/
    extract_landmarks.py      # Ekstraksi koordinat MediaPipe dari video (FEATURE_SPEC)
    record_samples.py         # Alat bantu rekam sampel landmark lokal
    train.py                  # Pelatihan model (Leave-One-Signer-Out) & evaluasi
    export_tfjs.py            # Konversi model ke format TensorFlow.js
    make_parity_fixture.py    # Pembuat fixture JSON untuk uji paritas ML-Web
    config.yaml               # Konfigurasi pipeline ML
    FEATURE_SPEC.md           # Spesifikasi tunggal fitur & normalisasi
    data/                     # [Diabaikan git] data/raw (video), data/own (rekaman)
    reports/                  # Laporan akurasi, confusion matrix, metrik
  web/
    src/                      # Komponen React, hooks, state reducer, parity tests
    public/models/            # Hasil ekspor TF.js (model.json, weights, model_meta.json)
    api/refine.ts             # Vercel serverless function (Gemini sentence refiner)
    shared/catalog.json       # Katalog pesan visual triase universal
    .env.example              # Contoh variabel lingkungan
  ASSUMPTIONS.md              # Catatan asumsi teknis & penyederhanaan desain
  README.md                   # Dokumentasi cara menjalankan proyek
```

---

## 2. Cara Menjalankan Bagian ML (Python Offline)

> **Catatan:** Python **hanya** digunakan secara offline di komputer pengembang untuk melatih dan mengekspor model. Python **tidak dijalankan** saat aplikasi web beroperasi.

1. **Prasyarat:**
   * Python 3.10 atau 3.11.

2. **Setup Lingkungan Virtual:**
   ```bash
   cd ml
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Alur Kerja Pipeline:**
   * **Ekstraksi Landmark:** Tempatkan dataset video di `ml/data/raw/`, lalu jalankan:
     ```bash
     python extract_landmarks.py
     ```
   * **Training & Evaluasi:**
     ```bash
     python train.py
     ```
     *(Hasil metrik dan confusion matrix akan tersimpan di `ml/reports/`).*
   * **Ekspor ke TensorFlow.js:**
     ```bash
     python export_tfjs.py
     ```
     *(Model tersimpan di `web/public/models/`).*
   * **Buat Fixture Paritas:**
     ```bash
     python make_parity_fixture.py
     ```

---

## 3. Cara Menjalankan Bagian Web (React + Vite + TypeScript)

1. **Prasyarat:**
   * Node.js v18+ (direkomendasikan v20+) dan npm.

2. **Instalasi Dependensi:**
   ```bash
   cd web
   npm install
   ```

3. **Menjalankan Server Pengembangan:**
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses di `http://localhost:5173`.

4. **Menjalankan Tes Unit & Paritas (Vitest):**
   ```bash
   npm run test
   ```

---

## 4. Variabel Lingkungan (Opsional untuk Fitur Gemini)

Salin `web/.env.example` ke `web/.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

---

## 5. Prinsip Keamanan & Privasi

1. **100% Client-Side:** Webcam dan inferensi gestur sepenuhnya berjalan di memori browser pengguna melalui WebAssembly dan WebGL. Tidak ada video atau koordinat yang dikirim ke server.
2. **Tanpa Penyimpanan Data:** Semua data triase hanya ada di state memori React. Menekan "Akhiri Sesi" akan langsung menghapus seluruh data sesi.
3. **Papan Visual Mandiri:** Seluruh fitur papan visual triase berfungsi penuh tanpa kamera, mikrofon, atau koneksi internet.
