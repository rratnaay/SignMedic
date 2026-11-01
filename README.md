# SignMedic: Jembatan Komunikasi Triase BISINDO

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-FF6F00.svg?logo=tensorflow)](https://www.tensorflow.org/js)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks_Vision_1.2-0078D4.svg)](https://developers.google.com/mediapipe)
[![WebRTC P2P](https://img.shields.io/badge/WebRTC-PeerJS_P2P-success.svg)](https://peerjs.com/)
[![Tests](https://img.shields.io/badge/Vitest-37%2F37_Passed-brightgreen.svg)](https://vitest.dev/)

> [!IMPORTANT]
> **PERNYATAAN BATASAN KLINIS (CLINICAL DISCLAIMER):**  
> SignMedic dirancang sebagai **alat bantu komunikasi awal** untuk menjembatani interaksi antara pasien Tuli pengguna Bahasa Isyarat Indonesia (BISINDO) dan tenaga medis di instalasi gawat darurat (IGD). Aplikasi ini **BUKAN perangkat medis penegak diagnosis** dan **TIDAK memberikan rekomendasi terapi atau keputusan triase otomatis**. Seluruh keputusan medis tetap berada di bawah wewenang tenaga kesehatan yang bertugas.

---

## 1. Latar Belakang & Masalah
Dalam situasi gawat darurat, komunikasi yang cepat dan akurat merupakan faktor penentu keselamatan pasien. Pasien Tuli kerap menghadapi hambatan komunikasi yang signifikan di meja triase ketika petugas tidak menguasai BISINDO, sementara komunikasi tertulis sering kali memakan waktu atau tidak optimal saat kondisi darurat.

SignMedic menghadirkan solusi komunikasi multimodal berbasis web yang ramah pengguna, berstandar privasi tinggi, dan dapat digunakan langsung dari perangkat apa pun (laptop, tablet, maupun smartphone).

---

## 2. Fitur Unggulan

### A. Papan Komunikasi Visual Universal (*Primary Fail-Safe*)
* Berisi katalog keluhan dan kebutuhan triase terstandar (Sakit Kepala, Dada, Perut, Demam, Alergi, Sesak Nafas, dll.).
* Bekerja 100% mandiri tanpa ketergantungan pada kamera, mikrofon, maupun koneksi internet.
* Pasien dapat menyusun ringkasan keluhan dengan satu sentuhan dan melakukan konfirmasi eksplisit sebelum data dikirimkan ke petugas.

### B. Pengenalan Gestur BISINDO In-Browser (11 Kelas Klinis)
* Mendeteksi 10 kelas kosakata klinis darurat (*Air, Makan, Saya, Tuli, Maaf, Terima kasih, Batuk, Demam, Pilek, Sesak Nafas*) ditambah 1 kelas penolakan gerakan di luar konteks (*_OTHER_*).
* **100% In-Memory:** Pemrosesan landmark MediaPipe dan inferensi model GRU (TF.js) berjalan sepenuhnya di memori peramban pengguna. Tidak ada frame video atau koordinat yang dikirim ke server cloud (*Privacy by Design*).
* Dilengkapi filter penstabilan probabilitas *Exponential Moving Average* (EMA) dan ambang batas stabilitas temporal ($N=2$).
* Antarmuka kamera responsif adaptif: rasio vertikal portrait (3:4) pada smartphone dan widescreen (16:10) pada komputer desktop/laptop.

### C. Sinkronisasi Multi-Device Real-Time (WebRTC Peer-to-Peer)
* Menghubungkan layar petugas (laptop/PC) dengan layar pasien (smartphone) secara *real-time*.
* Petugas cukup membuka sesi $\rightarrow$ sistem menerbitkan PIN 6-angka dan QR Code $\rightarrow$ pasien memindai dengan HP untuk terhubung langsung secara *peer-to-peer* (P2P).
* Menggunakan saluran data terenkripsi *end-to-end* (E2EE) tanpa memerlukan server WebSocket persisten di hosting cloud.

### D. Transkripsi Suara ke Teks Bahasa Indonesia (*Speech-to-Text*)
* Memanfaatkan *Web Speech API* beraksen bahasa Indonesia (`id-ID`).
* Instruksi atau pertanyaan dokter/perawat langsung tertranskripsi secara langsung ke layar pasien dengan tipografi besar berbobot tinggi yang mudah dibaca.

---

## 3. Arsitektur Proyek

```text
SignMedic/
├── ml/                           # Sumber Daya & Riset Machine Learning (Python)
│   ├── config.yaml               # Konfigurasi pipeline & hiperparameter model
│   ├── FEATURE_SPEC.md           # Spesifikasi matematis normalisasi fitur v2.0.0
│   ├── extract_landmarks.py      # Ekstraksi koordinat MediaPipe dari dataset video
│   ├── train.py                  # Pelatihan Conv1D-GRU dengan Leave-One-Signer-Out (LOSO)
│   ├── export_tfjs.py            # Konversi bobot model Keras ke format TensorFlow.js
│   ├── make_parity_fixture.py    # Generator fixture pengujian paritas numerik ML-Web
│   ├── test_video.py             # Verifikasi inferensi pada file rekaman video
│   ├── test_webcam.py            # Uji coba inferensi real-time webcam di Python
│   ├── requirements.txt          # Daftar dependensi pustaka Python
│   └── reports/                  # Laporan metrik evaluasi & matriks konfusi
│
├── web/                          # Aplikasi Web Produksi (Vite + React + TypeScript)
│   ├── public/
│   │   ├── models/               # Bobot model TF.js & model MediaPipe task
│   │   └── wasm/                 # Aset biner WebAssembly MediaPipe Vision
│   ├── shared/
│   │   └── catalog.json          # Katalog resmi pesan triase visual
│   ├── src/
│   │   ├── components/           # Komponen UI (CameraGesturePanel, Header, VisualBoard, dll.)
│   │   ├── ml/                   # Implementasi fitur extractor & gesture classifier (TF.js)
│   │   ├── state/                # State management triase & sinkronisasi WebRTC P2P
│   │   └── __tests__/            # Rangkaian pengujian unit, paritas numerik, dan alur triase
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── vercel.json                   # Konfigurasi deployment & SPA routing Vercel
├── DESIGN.md                     # Pedoman visual, tipografi, dan aksesibilitas
├── INSTALL.md                    # Panduan langkah demi langkah instalasi & eksekusi
└── README.md                     # Dokumentasi utama proyek
```

---

## 4. Dataset & Pelatihan Model

Dataset video bahasa isyarat yang digunakan dalam pengembangan dan pelatihan model ini bersumber dari:
* **Dataset Resmi:** [WL-BISINDO (Word-Level Indonesian Sign Language Dataset)](https://www.kaggle.com/datasets/glennleonali/wl-bisindo) oleh Glenn Leonali di Kaggle.
* **Format & Spesifikasi Fitur:** Diekstraksi menggunakan MediaPipe Tasks Vision ($T=30 \times 129$ fitur) dengan normalisasi Euclidean 3D, *active hand tracking*, penekanan tangan meja (*table-hand suppression*), dan penskalaan lebar telapak tangan sesuai [`FEATURE_SPEC.md`](ml/FEATURE_SPEC.md) v2.0.0.
* **Metode Validasi:** *Clean Nested Leave-One-Signer-Out* (LOSO Cross-Validation) untuk memastikan model mampu menggeneralisasi peragaan isyarat dari pasien baru yang belum pernah dilihat sebelumnya.

---

## 5. Cara Menjalankan Aplikasi

### Skenario 1: Menjalankan Aplikasi Web (Frontend & Demo)
Aplikasi web sudah dilengkapi dengan model AI bawaan yang telah diekspor. Anda **tidak perlu memasang Python** untuk menjalankan web.

1. **Prasyarat:** Node.js versi 18 atau 20 (LTS).
2. **Instalasi:**
   ```bash
   cd web
   npm install
   ```
3. **Jalankan Server Lokal:**
   ```bash
   npm run dev
   ```
   Buka peramban di `http://localhost:5173`.
4. **Menjalankan Pengujian (37/37 Unit Tests):**
   ```bash
   npm run test
   ```

### Skenario 2: Melatih Ulang Model Machine Learning (Python)
Gunakan opsi ini jika Anda ingin mengekstrak video baru, melatih model dengan validasi LOSO, atau memperbarui model TF.js:

1. **Prasyarat:** Python versi 3.10 atau 3.11.
2. **Setup Lingkungan Virtual:**
   ```bash
   cd ml
   python -m venv .venv

   # Di Windows:
   .\.venv\Scripts\activate
   # Di Linux / macOS:
   source .venv/bin/activate

   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. **Ekstraksi & Training:**
   ```bash
   # Ekstrak fitur dari video raw (FEATURE_SPEC v2.0.0)
   python extract_landmarks.py

   # Latih model Keras dengan evaluasi LOSO
   python train.py

   # Ekspor model ke TensorFlow.js untuk web
   python export_tfjs.py
   ```

---

## 6. Prinsip Keamanan & Privasi

1. **Zero Data Transmission (Video & Landmark):** Frame webcam dan koordinat persendian tangan diproses seketika di memori RAM peramban lokal. Tidak ada video yang direkam, disimpan ke media penyimpanan permanen, atau diunggah ke internet.
2. **Komunikasi Langsung Antar-Perangkat (E2EE P2P):** Sinkronisasi antara layar petugas dan layar pasien berjalan melalui saluran data WebRTC langsung antar-browser tanpa perantara penyimpanan cloud pihak ketiga.
3. **Penghapusan Data Seketika:** Seluruh catatan keluhan triase bersifat sementara (*ephemeral*). Menekan tombol *"Akhiri Sesi"* akan membersihkan seluruh riwayat komunikasi dari memori aplikasi.

---

## 7. Tim Pengembang

Proyek ini dikembangkan dan dirancang oleh tim **Satu Dua Tiga Aamin**:

* **Ratna Yuliana Triyono**
* **Natasya Jollyn Karisya Agustin**
* **Gani Abi Saputra Van Sigu**

---

## 8. AI Use and Third-Party Declaration

### A. Deklarasi Penggunaan AI (AI Use Declaration)
1. **Model Machine Learning Kustom (Client-Side On-Device AI):**
   - SignMedic melatih dan mengekspor arsitektur model *Deep Learning* kustom berbobot ringan (Conv1D + Gated Recurrent Unit / GRU) yang dieksekusi secara lokal di peramban menggunakan TensorFlow.js.
   - Model ini bertugas mengklasifikasikan 11 kelas isyarat klinis BISINDO secara *real-time* langsung di memori perangkat pengguna (*on-device inference* <150ms) dengan spesifikasi fitur v2.0.0 (*Active-Hand First Tracking* dan *Idle Table-Hand Suppression*).
2. **Bantuan AI dalam Proses Rekayasa (AI-Assisted Development):**
   - Selama proses pengembangan perangkat lunak, tim memanfaatkan *Large Language Model* / alat bantu pengkodean AI (seperti Google Gemini / Antigravity) untuk membantu:
     - Pembuatan skenario pengujian unit otomatis komprehensif (37/37 lulus uji di Vitest).
     - Audit paritas numerik antara pipeline ekstraksi fitur Python dan modul inferensi web TypeScript.
     - Penulisan draf dokumentasi teknis dan panduan integrasi sistem.
   - Seluruh arsitektur kode, integrasi WebRTC peer-to-peer, pengujian klinis, dan logika triase telah divalidasi, disetujui, dan diuji langsung oleh tim pengembang.

### B. Deklarasi Aset & Pustaka Pihak Ketiga (Third-Party Assets & Libraries Declaration)
Proyek ini dibangun dengan menghormati lisensi sumber terbuka dari pihak ketiga:
1. **Dataset Pihak Ketiga:**
   - **WL-BISINDO:** [Word-Level Indonesian Sign Language Dataset](https://www.kaggle.com/datasets/glennleonali/wl-bisindo) oleh Glenn Leonali di Kaggle (lisensi terbuka untuk riset dan pendidikan).
   - Diperkaya secara independen oleh tim pengembang dengan merekam dan menambahkan dataset gestur klinis IGD (*Batuk*, *Demam*, *Pilek*, dan *Sesak Nafas* dua tangan) untuk mengatasi kelangkaan data bahasa isyarat medis di Indonesia.
2. **Pustaka & Kerangka Kerja Terbuka:**
   - **Computer Vision & Tracking:** Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) &mdash; *Lisensi Apache 2.0*.
   - **Machine Learning Runtime:** Google TensorFlow.js (`@tensorflow/tfjs`) &mdash; *Lisensi Apache 2.0*.
   - **Peer-to-Peer Networking:** PeerJS (`peerjs`) &mdash; *Lisensi MIT*.
   - **Frontend & Styling:** React 18, TypeScript, Tailwind CSS, Lucide React (`lucide-react`) &mdash; *Lisensi MIT*.
   - **Pengujian & Build Tools:** Vitest, Vite &mdash; *Lisensi MIT*.
   - **Speech Recognition:** Standar W3C Web Speech API bawaan peramban (*browser native API*).

---

## 9. Lisensi

Hak Cipta &copy; 2026 Tim SignMedic (Satu Dua Tiga Aamin). Dikembangkan untuk kemanusiaan, inklusivitas layanan kesehatan, dan aksesibilitas komunikasi pasien tunarungu di Indonesia.
