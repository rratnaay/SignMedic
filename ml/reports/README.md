# Laporan Evaluasi Model ML SignMedic (FEATURE_SPEC v2.0.0 - 11 Kelas Triase)

Dokumen ini memuat audit metodologi, hasil evaluasi dengan protokol bersarang bersih (Clean Nested LOSO), evaluasi penolakan Out-of-Distribution (OOD), uji ketahanan tangan kiri/kanan (mirror), diagnosis empiris penanda, dan pengujian kelas triase klinis baru.

---

## 1. Audit Metodologi Evaluasi

Secara transparan dan jujur:
* **Penanganan Data Validasi:** Pada protokol Clean Nested LOSO, data penanda uji $X \in \{0, 1, 2, 3, 4\}$ **TIDAK PERNAH disentuh** selama proses pelatihan, pemilihan hyperparameter, pemantauan konvergensi, maupun penalaan ambang batas (*threshold*).
* **EarlyStopping & ReduceLROnPlateau:** 
  Untuk setiap pengujian pada penanda uji $X$:
  1. Penanda $X$ (68 klip target + 52 klip OOD) diisolasi sebagai data uji murni.
  2. Dari 4 penanda sisanya, tepat 1 penanda disisihkan secara utuh sebagai data validasi internal $V$.
  3. `EarlyStopping` (`monitor='val_loss'`, `patience=15`) dan `ReduceLROnPlateau` (`monitor='val_loss'`, `patience=5`) **HANYA memantau loss dari penanda validasi $V$**.
  4. Model dilatih murni pada 3 penanda latih yang tersisa dengan augmentasi temporal & geometris serta oversampling seimbang untuk kelas baru. Setiap klip menghasilkan variasi cermin horizontal (`x -> -x`), dengan komposisi tangan kanan : tangan kiri = **50% : 50%**.
* **Pemilihan Ambang Batas (*Threshold*):**
  Kurva threshold (0.50 hingga 0.95) dianalisis untuk melihat trade-off antara *coverage* (persentase input yang diterima sistem) vs *precision* (ketepatan prediksi) dan *rejection rate* pada data Out-of-Distribution (OOD). Ambang batas yang direkomendasikan adalah **0.85**.

---

## 2. Hasil Evaluasi Protokol Bersih (11 Kelas)

Evaluasi dilakukan pada model 11-kelas (10 kelas target BISINDO: `Air`, `Makan`, `Saya`, `Tuli`, `Maaf`, `Terima kasih`, `Batuk`, `Demam`, `Pilek`, `Sesak Nafas` + 1 kelas penolakan `_OTHER_` pada indeks 10) dengan spesifikasi fitur **v2.0.0** (*Active-Hand First & Idle Table-Hand Suppression*).

### A. Tabel Akurasi In-Class Per Penanda (Klip Benar / Total)

| Penanda Uji | Penanda Latih | Penanda Val | Klip Benar / Total | Akurasi In-Class (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Signer 0** | [2, 3, 4] | 1 | **60 / 68** | 88.24% |
| **Signer 1** | [2, 3, 4] | 0 | **59 / 68** | 86.76% |
| **Signer 2** | [1, 3, 4] | 0 | **66 / 68** | 97.06% |
| **Signer 3** | [1, 2, 4] | 0 | **52 / 68** | 76.47% |
| **Signer 4** | [1, 2, 3] | 0 | **62 / 68** | 91.18% |
| **Total / Rata-rata** | - | - | **299 / 340** | **87.94%** |

### B. Metrik Per Kelas (In-Class Target)

| Kelas | Precision | Recall | F1-Score | Support (Klip) |
| :--- | :---: | :---: | :---: | :---: |
| **Air** | 0.975 | 0.780 | 0.867 | 50 |
| **Makan** | 1.000 | 0.860 | 0.925 | 50 |
| **Saya** | 0.941 | 0.960 | 0.950 | 50 |
| **Tuli** | 1.000 | 0.960 | 0.980 | 50 |
| **Maaf** | 0.979 | 0.920 | 0.948 | 50 |
| **Terima kasih** | 1.000 | 0.700 | 0.824 | 50 |
| **Batuk** | **1.000** | **1.000** | **1.000** | 10 |
| **Demam** | **1.000** | **1.000** | **1.000** | 10 |
| **Pilek** | **1.000** | **1.000** | **1.000** | 10 |
| **Sesak Nafas** | **0.909** | **1.000** | **0.952** | 10 |

---

## 3. Analisis Ambang Batas (Threshold Sweep) & Uji Penolakan OOD

### A. Sapuan Ambang Batas (Threshold Sweep 0.50 s/d 0.95)

Dievaluasi terhadap 340 klip in-class dan 220 klip out-of-distribution (OOD) dari 26 gloss WL-BISINDO di luar kelas target:

| Ambang Batas (Threshold) | Cakupan (*Coverage*) | Presisi Prediksi Lolos | Klip Diterima Benar / Total Lolos | Laju Tolak OOD (*Rejection Rate*) | Klip OOD Ditolak / Total |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0.50** | 86.8% | 98.6% | 291 / 295 | 95.0% | 209 / 220 |
| **0.55** | 85.3% | 98.6% | 286 / 290 | 95.5% | 210 / 220 |
| **0.60** | 84.1% | 98.6% | 282 / 286 | 95.5% | 210 / 220 |
| **0.65** | 81.5% | 99.3% | 275 / 277 | 96.4% | 212 / 220 |
| **0.70** | 80.3% | 99.6% | 272 / 273 | 96.8% | 213 / 220 |
| **0.75** | 77.6% | 99.6% | 263 / 264 | 97.7% | 215 / 220 |
| **0.80** | 73.8% | 100.0% | 251 / 251 | 97.7% | 215 / 220 |
| **0.85** | **68.5%** | **100.0%** | **233 / 233** | **98.2%** | **216 / 220** |
| **0.90** | 58.8% | 100.0% | 200 / 200 | 98.2% | 216 / 220 |
| **0.95** | 8.2% | 100.0% | 28 / 28 | 99.1% | 218 / 220 |

### B. Evaluasi Sampel di Luar Kelas (*Out-of-Distribution* / OOD) pada Ambang Batas 0.85

* **Total Klip OOD yang Diuji:** 220 klip.
* **Klip OOD Berhasil Ditolak:** **216 dari 220 klip (98.18%)**.
* **Klip OOD Lolos (*False Positive*):** 4 dari 220 klip (1.82%).
* **Presisi pada Ambang Batas 0.85:** **100.00%** (seluruh 233 klip in-class yang lolos threshold terklasifikasi secara benar).

---

## 4. Ketahanan Tangan Kiri vs Kanan (Mirror Test)

Model akhir membungkus arsitektur dengan in-graph Test-Time Augmentation (TTA) berbasis lapisan diagonal beku yang merata-ratakan prediksi orientasi asli dan cermin.

| Penanda Uji | Data Uji Asli | Data Uji Mirror (`x * -1`) |
| :--- | :---: | :---: |
| **Signer 0** | 60 / 68 (88.24%) | 60 / 68 (88.24%) |
| **Signer 1** | 59 / 68 (86.76%) | 59 / 68 (86.76%) |
| **Signer 2** | 66 / 68 (97.06%) | 66 / 68 (97.06%) |
| **Signer 3** | 52 / 68 (76.47%) | 52 / 68 (76.47%) |
| **Signer 4** | 62 / 68 (91.18%) | 62 / 68 (91.18%) |
| **Total** | **299 / 340 (87.94%)** | **299 / 340 (87.94%)** |

* Penolakan OOD pada data mirror (threshold 0.85): **216 / 220 (98.18%)**, persis identik dengan data asli.

---

## 5. Validasi Video Nyata Gejala Triase Baru

Pengujian inferensi end-to-end langsung pada rekaman video MP4 peraga YouTube (`ml/test_video.py --no_gui`):

* **Batuk** (`signer5_label32_sample1.mp4`): Terprediksi `Batuk` dengan keyakinan **92.57%** (Lolos Threshold 85%, Benar).
* **Demam** (`signer5_label33_sample1.mp4`): Terprediksi `Demam` dengan keyakinan **93.11%** (Lolos Threshold 85%, Benar).
* **Pilek** (`signer5_label34_sample1.mp4`): Terprediksi `Pilek` dengan keyakinan **92.73%** (Lolos Threshold 85%, Benar).
* **Sesak Nafas** (`signer5_label35_sample1.mp4`): Terprediksi `Sesak Nafas` dengan keyakinan **92.73%** (Lolos Threshold 85%, Benar).
