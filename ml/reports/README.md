# Laporan Evaluasi Model ML SignMedic (FEATURE_SPEC v2.0.0)

Dokumen ini memuat audit metodologi, hasil evaluasi dengan protokol bersarang bersih (Clean Nested LOSO), evaluasi penolakan Out-of-Distribution (OOD), diagnosis empiris penanda, dan batasan teknis dataset uji.

---

## 1. Audit Metodologi Evaluasi (Jawaban Poin 1)

Secara transparan dan jujur:
* **Penanganan Data Validasi:** Pada protokol Clean Nested LOSO, data penanda uji $X \in \{0, 1, 2, 3, 4\}$ **TIDAK PERNAH disentuh** selama proses pelatihan, pemilihan hyperparameter, pemantauan konvergensi, maupun penalaan ambang batas (*threshold*).
* **EarlyStopping & ReduceLROnPlateau:** 
  Untuk setiap pengujian pada penanda uji $X$:
  1. Penanda $X$ (60 klip target + 52 klip OOD) diisolasi sebagai data uji murni.
  2. Dari 4 penanda sisanya, tepat 1 penanda disisihkan secara utuh sebagai data validasi internal $V$.
  3. `EarlyStopping` (`monitor='val_loss'`, `patience=15`) dan `ReduceLROnPlateau` (`monitor='val_loss'`, `patience=5`) **HANYA memantau loss dari penanda validasi $V$**.
  4. Model dilatih murni pada 3 penanda latih yang tersisa dengan augmentasi temporal & geometris (4x perbanyakan).
* **Pemilihan Ambang Batas (*Threshold*):**
  Kurva threshold (0.50 hingga 0.95) dianalisis untuk melihat trade-off antara *coverage* (persentase input yang diterima sistem) vs *precision* (ketepatan prediksi) dan *rejection rate* pada data Out-of-Distribution (OOD). Ambang batas yang direkomendasikan adalah **0.85**.

---

## 2. Hasil Evaluasi Protokol Bersih (Jawaban Poin 2)

Evaluasi dilakukan pada model 7-kelas (6 kelas target BISINDO: `Air`, `Makan`, `Saya`, `Tuli`, `Maaf`, `Terima kasih` + 1 kelas penolakan `_OTHER_` pada indeks 6) dengan spesifikasi fitur **v2.0.0** (*Active-Hand First & Idle Table-Hand Suppression*).

### A. Tabel Akurasi In-Class Per Penanda (Klip Benar / Total)

| Penanda Uji | Penanda Latih | Penanda Val | Klip Benar / Total | Akurasi In-Class (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Signer 0** | [2, 3, 4] | 1 | **51 / 60** | 85.00% |
| **Signer 1** | [2, 3, 4] | 0 | **55 / 60** | 91.67% |
| **Signer 2** | [1, 3, 4] | 0 | **55 / 60** | 91.67% |
| **Signer 3** | [1, 2, 4] | 0 | **49 / 60** | **81.67%** |
| **Signer 4** | [1, 2, 3] | 0 | **57 / 60** | 95.00% |
| **Total / Rata-rata** | - | - | **267 / 300** | **89.00%** |

### B. Metrik Per Kelas (In-Class Target)

| Kelas | Precision | Recall | F1-Score | Support (Klip) |
| :--- | :---: | :---: | :---: | :---: |
| **Air** | 0.9737 | 0.7400 | 0.8409 | 50 |
| **Makan** | 1.0000 | 0.8800 | 0.9362 | 50 |
| **Saya** | 0.9608 | 0.9800 | 0.9703 | 50 |
| **Tuli** | 0.9796 | 0.9600 | 0.9697 | 50 |
| **Maaf** | 1.0000 | 0.9600 | 0.9796 | 50 |
| **Terima kasih** | 0.9318 | 0.8200 | 0.8723 | 50 |

---

## 3. Analisis Ambang Batas (Threshold Sweep) & Uji Penolakan OOD (Jawaban Poin 3)

### A. Sapuan Ambang Batas (Threshold Sweep 0.50 s/d 0.95)

Dievaluasi terhadap 300 klip in-class dan 220 klip out-of-distribution (OOD) dari 26 gloss WL-BISINDO di luar kelas target:

| Ambang Batas (Threshold) | Cakupan (*Coverage*) | Presisi Prediksi Lolos | Klip Diterima Benar / Total Lolos | Laju Tolak OOD (*Rejection Rate*) | Klip OOD Ditolak / Total |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0.50** | 87.67% | 98.48% | 259 / 263 | 89.55% | 197 / 220 |
| **0.55** | 86.00% | 98.84% | 255 / 258 | 90.91% | 200 / 220 |
| **0.60** | 85.00% | 98.82% | 252 / 255 | 91.36% | 201 / 220 |
| **0.65** | 84.67% | 98.82% | 251 / 254 | 92.27% | 203 / 220 |
| **0.70** | 83.00% | 99.20% | 247 / 249 | 93.18% | 205 / 220 |
| **0.75** | 81.00% | 99.59% | 242 / 243 | 94.55% | 208 / 220 |
| **0.80** | 77.00% | 99.57% | 230 / 231 | 95.45% | 210 / 220 |
| **0.85** | **70.67%** | **99.53%** | **211 / 212** | **95.91%** | **211 / 220** |
| **0.90** | 57.00% | 99.42% | 170 / 171 | 96.82% | 213 / 220 |
| **0.95** | 15.67% | 97.87% | 46 / 47 | 99.55% | 219 / 220 |

### B. Evaluasi Sampel di Luar Kelas (*Out-of-Distribution* / OOD) pada Ambang Batas 0.85

* **Total Klip OOD yang Diuji:** 220 klip (dari 5 penanda uji murni pada masing-masing fold LOSO).
* **Klip OOD Berhasil Ditolak:** **211 dari 220 klip (95.91%)**.
  - Rincian tolak per penanda uji: Signer 0 (12/12 = 100%), Signer 1 (49/52 = 94.23%), Signer 2 (52/52 = 100%), Signer 3 (51/52 = 98.08%), Signer 4 (47/52 = 90.38%).
* **Klip OOD Salah Lolos (*False Positive*):** 9 dari 220 klip (4.09%).
* **Label Salah yang Diberikan pada 9 Klip OOD yang Lolos:**
  - `Air`: 1 klip
  - `Makan`: 2 klip
  - `Saya`: 0 klip
  - `Tuli`: 0 klip
  - `Maaf`: 3 klip
  - `Terima kasih`: 3 klip

---

## 4. Diagnosis Empiris Penanda Terendah: Signer 3 (Jawaban Poin 4)

### A. Akar Masalah Pada Spesifikasi Fitur v1.0.0
Pada iterasi awal (FEATURE_SPEC v1.0.0), pengurutan tangan hanya berdasarkan koordinat horizontal `wrist.x` (kiri ke kanan). Signer 3 memiliki kebiasaan meletakkan tangan kirinya yang pasif di atas meja di sebelah kiri layar, sementara tangan kanannya yang aktif memperagakan isyarat berada di sebelah kanan.
Akibatnya:
1. Tangan pasif yang diam di meja selalu masuk ke slot `hand_0` (indeks 0..62).
2. Tangan aktif terlempar ke slot `hand_1` (indeks 63..125).
3. Frame dengan `hand_1` aktif melonjak hingga **56.33%** (sedangkan penanda lain hanya ~5%).
4. Prediksi kolaps: 29 dari 31 klip salah diprediksi secara keliru sebagai `Makan`. Akurasi Signer 3 anjlok ke 48.33% (29/60).

### B. Perbaikan dengan FEATURE_SPEC v2.0.0
Penerapan **Active-Hand First** (penentuan tangan utama berdasarkan skor lintasan gerak `path_len` dan elevasi `1.0 - wrist.y`) serta **Idle Table-Hand Suppression** (menolkan fitur `hand_1` jika perpindahannya $< 25\%$ dari tangan utama dan posisinya lebih rendah):
1. **Kehadiran Hand 1:** Turun drastis dari **56.33%** menjadi **28.00%** (berkurang setengahnya).
2. **Akurasi Signer 3:** Melonjak dari **48.33% (29/60)** menjadi **81.67% (49/60)**.
3. **Pola Kesalahan (11 klip salah):**
   - Kolaps ke kelas `Makan` tereliminasi sepenuhnya.
   - Kesalahan didominasi oleh penolakan aman ke kelas `_OTHER_`:
     - `Air -> _OTHER_`: 4 klip
     - `Terima kasih -> _OTHER_`: 3 klip
     - `Terima kasih -> Saya`: 2 klip
     - `Tuli -> _OTHER_`: 1 klip
     - `Makan -> _OTHER_`: 1 klip
   - Penolakan ke `_OTHER_` adalah kegagalan aman (*graceful degradation*) karena model memilih menolak daripada memberikan diagnosis keluhan palsu.

---

## 5. Perbandingan Model v1.0.0 vs v2.0.0 (Jawaban Poin 5)

| Parameter / Metrik | Model v1.0.0 (Closed-Set 6 Kelas) | Model v2.0.0 (7-Class Active-Hand First) |
| :--- | :---: | :---: |
| **Protokol Evaluasi** | Clean Nested LOSO | Clean Nested LOSO |
| **Dimensi Fitur** | (30, 129) - wrist.x naive sort | (30, 129) - active-hand first & suppression |
| **Jumlah Kelas Output** | 6 (Closed-set Softmax) | 7 (6 Target + 1 `_OTHER_` OOD Rejection) |
| **Akurasi Signer 0** | 95.00% (57/60) | 85.00% (51/60) |
| **Akurasi Signer 1** | 95.00% (57/60) | 91.67% (55/60) |
| **Akurasi Signer 2** | 100.00% (60/60) | 91.67% (55/60) |
| **Akurasi Signer 3** | **48.33% (29/60)** | **81.67% (49/60)** *(+33.34%)* |
| **Akurasi Signer 4** | 93.33% (56/60) | 95.00% (57/60) |
| **Akurasi Rata-rata In-Class** | 86.33% (259/300) | **89.00% (267/300)** |
| **Laju Tolak OOD (Threshold 0.85)** | **23.1% (60/260)** | **95.91% (211/220)** *(+72.81%)* |
| **Presisi pada Threshold 0.85** | 95.4% | **99.53% (211/212)** |

---

## 6. Keterbatasan Nyata Proyek (Jawaban Poin 6)

1. **Ukuran Sampel Uji:** Evaluasi dilakukan pada 5 penanda dengan total 300 klip in-class dan 220 klip OOD. Pengujian pada populasi pengguna tunarungu yang lebih luas tetap diperlukan di dunia nyata.
2. **Dataset Pengganti (Surrogate Data):** Dataset WL-BISINDO direkam dalam kondisi pencahayaan laboratorium yang stabil di Banten, bukan penutur asli varian lokal Jawa Timur dengan latar belakang IGD rumah sakit yang bising secara visual.
3. **Bukan Kelas Keluhan Klinis Murni:** Enam kelas yang diuji (`Air`, `Makan`, `Saya`, `Tuli`, `Maaf`, `Terima kasih`) adalah kata dasar sehari-hari. Pada sistem triase klinis sebenarnya, kosakata harus mencakup keluhan triase (nyeri, sesak, demam, dsb.).
4. **Peran UI Triase:** Walaupun penolakan OOD model telah mencapai 95.91% dan presisi 99.53%, aplikasi SignMedic tetap mewajibkan tombol konfirmasi pasien (*Patient Verification Step*) sebelum informasi diteruskan ke perawat/dokter IGD, serta menjadikan Papan Komunikasi Visual ber-AAC (*Augmentative and Alternative Communication*) sebagai metode interaksi utama non-verbal.
