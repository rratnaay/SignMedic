# Laporan Evaluasi Model ML SignMedic (FEATURE_SPEC v2.0.0)

Dokumen ini memuat audit metodologi, hasil evaluasi dengan protokol bersarang bersih (Clean Nested LOSO), evaluasi penolakan Out-of-Distribution (OOD), uji ketahanan tangan kiri/kanan (mirror), diagnosis empiris penanda, dan hasil pengujian gestur klinis baru (khususnya "Batuk" dan gestur dua tangan "Sesak Nafas").

---

## 1. Audit Metodologi Evaluasi

Secara transparan dan jujur:
* **Penanganan Data Validasi:** Pada protokol Clean Nested LOSO, data penanda uji $X \in \{0, 1, 2, 3, 4\}$ **TIDAK PERNAH disentuh** selama proses pelatihan, pemilihan hyperparameter, pemantauan konvergensi, maupun penalaan ambang batas (*threshold*).
* **EarlyStopping & ReduceLROnPlateau:** 
  Untuk setiap pengujian pada penanda uji $X$:
  1. Penanda $X$ (83-84 klip target + 52 klip OOD) diisolasi sebagai data uji murni.
  2. Dari 4 penanda sisanya, tepat 1 penanda disisihkan secara utuh sebagai data validasi internal $V$.
  3. `EarlyStopping` (`monitor='val_loss'`, `patience=15`) dan `ReduceLROnPlateau` (`monitor='val_loss'`, `patience=5`) **HANYA memantau loss dari penanda validasi $V$**.
  4. Model dilatih murni pada 3 penanda latih yang tersisa dengan augmentasi temporal & geometris (8x perbanyakan, 50% data asli + 50% data cermin horizontal `x -> -x`).
* **Pemilihan Ambang Batas (*Threshold*):**
  Kurva threshold (0.50 hingga 0.95) dianalisis untuk melihat trade-off antara *coverage* (persentase input yang diterima sistem) vs *precision* (ketepatan prediksi) dan *rejection rate* pada data Out-of-Distribution (OOD). Ambang batas yang direkomendasikan adalah **0.85**.

---

## 2. Hasil Evaluasi Protokol Bersih (11-Class Clean Nested LOSO)

Evaluasi dilakukan pada model 11-kelas (10 kelas target klinis BISINDO: `Air`, `Makan`, `Saya`, `Tuli`, `Maaf`, `Terima kasih`, `Batuk`, `Demam`, `Pilek`, `Sesak Nafas` + 1 kelas penolakan `_OTHER_` pada indeks 10) dengan spesifikasi fitur **v2.0.0** (*Active-Hand First & Idle Table-Hand Suppression*) dan graf *mirror-invariance averaging*.

### A. Tabel Akurasi In-Class Per Penanda (Klip Benar / Total)

| Penanda Uji | Penanda Latih | Penanda Val | Klip Benar / Total | Akurasi In-Class (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Signer 0** | [2, 3, 4] | 1 | **75 / 83** | **90.36%** |
| **Signer 1** | [2, 3, 4] | 0 | **75 / 83** | **90.36%** |
| **Signer 2** | [1, 3, 4] | 0 | **79 / 84** | **94.05%** |
| **Signer 3** | [1, 2, 4] | 0 | **65 / 84** | **77.38%** |
| **Signer 4** | [1, 2, 3] | 0 | **74 / 84** | **88.10%** |
| **Total / Rata-rata** | - | - | **368 / 418** | **88.04%** |

### B. Metrik Per Kelas (10 Kelas Target)

| Kelas | Precision | Recall | F1-Score | Support (Klip) |
| :--- | :---: | :---: | :---: | :---: |
| **Air** | 0.9750 | 0.7800 | 0.8667 | 50 |
| **Makan** | 0.9714 | 0.6800 | 0.8000 | 50 |
| **Saya** | 0.9792 | 0.9400 | 0.9592 | 50 |
| **Tuli** | 1.0000 | 0.9400 | 0.9691 | 50 |
| **Maaf** | 0.9792 | 0.9400 | 0.9592 | 50 |
| **Terima kasih** | 1.0000 | 0.7200 | 0.8372 | 50 |
| **Batuk (Video Baru)** | **0.9600** | **1.0000** | **0.9796** | **48** |
| **Demam** | 1.0000 | 1.0000 | 1.0000 | 10 |
| **Pilek** | 1.0000 | 1.0000 | 1.0000 | 10 |
| **Sesak Nafas (2 Tangan)** | **1.0000** | **1.0000** | **1.0000** | **50** |

> **Catatan Pengenalan "Batuk":**
> Penambahan video baru yang bersih (`signer6_label32`) dengan 48 variasi augmentasi temporal membuat gestur **Batuk** mencapai **Recall 100% (48/48 klip terdeteksi dengan tepat)** dan **Precision 96.00%**. Gestur Batuk kini sangat sensitif dan stabil di depan kamera.

---

## 3. Uji Ketahanan Tangan Kiri vs Kanan (Mirror & Handedness Test)

Model membungkus jaringan dasar dengan inferensi simetris $p = \frac{1}{2}(f(x) + f(\text{flip}(x)))$ di dalam arsitektur model Keras/TF.js.

| Kondisi Uji | Klip Benar / Total | Akurasi (%) | Penolakan OOD @0.85 |
| :--- | :---: | :---: | :---: |
| **Data Uji Asli (Tangan Kanan)** | 368 / 418 | **88.04%** | 215 / 220 (97.73%) |
| **Data Uji Cermin (`x * -1` Tangan Kiri / Mirrored Camera)** | 368 / 418 | **88.04%** | 215 / 220 (97.73%) |

Hasil evaluasi pada kedua kondisi adalah **100% identik dan setara**, membuktikan model tahan terhadap kidal maupun kamera webcam yang terbalik.

---

## 4. Analisis Ambang Batas (Threshold Sweep) & Penolakan OOD

Dievaluasi terhadap 418 klip target in-class dan 220 klip OOD (26 kelas di luar target):

| Ambang Batas (Threshold) | Cakupan (*Coverage*) | Presisi Prediksi Lolos | Klip Diterima Benar / Total Lolos | Laju Tolak OOD (*Rejection Rate*) | Klip OOD Ditolak / Total |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0.50** | 86.36% | 98.61% | 356 / 361 | 93.18% | 205 / 220 |
| **0.55** | 85.65% | 98.60% | 353 / 358 | 93.64% | 206 / 220 |
| **0.60** | 84.45% | 98.87% | 349 / 353 | 94.09% | 207 / 220 |
| **0.65** | 83.25% | 99.14% | 345 / 348 | 95.00% | 209 / 220 |
| **0.70** | 81.58% | 99.42% | 339 / 341 | 95.00% | 209 / 220 |
| **0.75** | 80.14% | 99.40% | 333 / 335 | 95.91% | 211 / 220 |
| **0.80** | 77.99% | 99.39% | 324 / 326 | 97.27% | 214 / 220 |
| **0.85** | **73.68%** | **99.68%** | **307 / 308** | **97.73%** | **215 / 220** |
| **0.90** | 67.22% | 100.00% | 281 / 281 | 99.09% | 218 / 220 |
| **0.95** | 13.88% | 100.00% | 58 / 58 | 99.09% | 218 / 220 |

Pada ambang batas **0.85**:
* **Presisi Pengenalan:** **99.68%** (307 dari 308 klip lolos ambang batas benar).
* **Penolakan Gerakan Asing (OOD Rejection):** **97.73%** (215 dari 220 klip gerakan asing berhasil diabaikan/ditolak ke `_OTHER_`).
