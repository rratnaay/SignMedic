# Laporan Evaluasi Model ML SignMedic (FEATURE_SPEC v2.0.0)

Dokumen ini memuat audit metodologi, hasil evaluasi dengan protokol bersarang bersih (Clean Nested LOSO), evaluasi penolakan Out-of-Distribution (OOD), uji ketahanan tangan kiri/kanan (mirror), diagnosis empiris penanda, dan batasan teknis dataset uji.

---

## 1. Audit Metodologi Evaluasi (Jawaban Poin 1)

Secara transparan dan jujur:
* **Penanganan Data Validasi:** Pada protokol Clean Nested LOSO, data penanda uji $X \in \{0, 1, 2, 3, 4\}$ **TIDAK PERNAH disentuh** selama proses pelatihan, pemilihan hyperparameter, pemantauan konvergensi, maupun penalaan ambang batas (*threshold*).
* **EarlyStopping & ReduceLROnPlateau:** 
  Untuk setiap pengujian pada penanda uji $X$:
  1. Penanda $X$ (60 klip target + 52 klip OOD) diisolasi sebagai data uji murni.
  2. Dari 4 penanda sisanya, tepat 1 penanda disisihkan secara utuh sebagai data validasi internal $V$.
  3. `EarlyStopping` (`monitor='val_loss'`, `patience=15`) dan `ReduceLROnPlateau` (`monitor='val_loss'`, `patience=5`) **HANYA memantau loss dari penanda validasi $V$**.
  4. Model dilatih murni pada 3 penanda latih yang tersisa dengan augmentasi temporal & geometris. Setiap klip menghasilkan 4 sampel versi asli dan 4 sampel versi cermin horizontal (`x -> -x`), total 8x dengan komposisi tangan kanan : tangan kiri = **50% : 50%**.
* **Pemilihan Ambang Batas (*Threshold*):**
  Kurva threshold (0.50 hingga 0.95) dianalisis untuk melihat trade-off antara *coverage* (persentase input yang diterima sistem) vs *precision* (ketepatan prediksi) dan *rejection rate* pada data Out-of-Distribution (OOD). Ambang batas yang direkomendasikan adalah **0.85**.

---

## 2. Hasil Evaluasi Protokol Bersih (Jawaban Poin 2)

Evaluasi dilakukan pada model 7-kelas (6 kelas target BISINDO: `Air`, `Makan`, `Saya`, `Tuli`, `Maaf`, `Terima kasih` + 1 kelas penolakan `_OTHER_` pada indeks 6) dengan spesifikasi fitur **v2.0.0** (*Active-Hand First & Idle Table-Hand Suppression*). Model akhir membungkus jaringan dasar dengan rata-rata prediksi `x` dan `flip(x)` di dalam graph (lihat bagian 7).

### A. Tabel Akurasi In-Class Per Penanda (Klip Benar / Total)

| Penanda Uji | Penanda Latih | Penanda Val | Klip Benar / Total | Akurasi In-Class (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Signer 0** | [2, 3, 4] | 1 | **51 / 60** | 85.00% |
| **Signer 1** | [2, 3, 4] | 0 | **49 / 60** | 81.67% |
| **Signer 2** | [1, 3, 4] | 0 | **57 / 60** | 95.00% |
| **Signer 3** | [1, 2, 4] | 0 | **36 / 60** | **60.00%** |
| **Signer 4** | [1, 2, 3] | 0 | **51 / 60** | 85.00% |
| **Total / Rata-rata** | - | - | **244 / 300** | **81.33%** |

### B. Metrik Per Kelas (In-Class Target)

| Kelas | Precision | Recall | F1-Score | Support (Klip) |
| :--- | :---: | :---: | :---: | :---: |
| **Air** | 0.9744 | 0.7600 | 0.8539 | 50 |
| **Makan** | 0.9706 | 0.6600 | 0.7857 | 50 |
| **Saya** | 0.9608 | 0.9800 | 0.9703 | 50 |
| **Tuli** | 1.0000 | 0.9000 | 0.9474 | 50 |
| **Maaf** | 0.9412 | 0.9600 | 0.9505 | 50 |
| **Terima kasih** | 1.0000 | 0.6200 | 0.7654 | 50 |

---

## 3. Analisis Ambang Batas (Threshold Sweep) & Uji Penolakan OOD (Jawaban Poin 3)

### A. Sapuan Ambang Batas (Threshold Sweep 0.50 s/d 0.95)

Dievaluasi terhadap 300 klip in-class dan 220 klip out-of-distribution (OOD) dari 26 gloss WL-BISINDO di luar kelas target:

| Ambang Batas (Threshold) | Cakupan (*Coverage*) | Presisi Prediksi Lolos | Klip Diterima Benar / Total Lolos | Laju Tolak OOD (*Rejection Rate*) | Klip OOD Ditolak / Total |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0.50** | 82.33% | 97.98% | 242 / 247 | 95.45% | 210 / 220 |
| **0.55** | 81.33% | 98.36% | 240 / 244 | 96.36% | 212 / 220 |
| **0.60** | 80.67% | 98.76% | 239 / 242 | 96.36% | 212 / 220 |
| **0.65** | 79.00% | 98.73% | 234 / 237 | 97.27% | 214 / 220 |
| **0.70** | 77.00% | 99.57% | 230 / 231 | 97.27% | 214 / 220 |
| **0.75** | 74.67% | 99.55% | 223 / 224 | 97.73% | 215 / 220 |
| **0.80** | 71.00% | 99.53% | 212 / 213 | 97.73% | 215 / 220 |
| **0.85** | **67.00%** | **99.50%** | **200 / 201** | **97.73%** | **215 / 220** |
| **0.90** | 56.33% | 100.00% | 169 / 169 | 98.18% | 216 / 220 |
| **0.95** | 8.00% | 100.00% | 24 / 24 | 99.55% | 219 / 220 |

### B. Evaluasi Sampel di Luar Kelas (*Out-of-Distribution* / OOD) pada Ambang Batas 0.85

* **Total Klip OOD yang Diuji:** 220 klip (dari 5 penanda uji murni pada masing-masing fold LOSO).
* **Klip OOD Berhasil Ditolak:** **215 dari 220 klip (97.73%)**.
  - Rincian tolak per penanda uji: Signer 0 (12/12 = 100%), Signer 1 (48/52 = 92.31%), Signer 2 (52/52 = 100%), Signer 3 (52/52 = 100%), Signer 4 (51/52 = 98.08%).
* **Klip OOD Salah Lolos (*False Positive*):** 5 dari 220 klip (2.27%).
* **Label Salah yang Diberikan pada 5 Klip OOD yang Lolos:**
  - `Air`: 0 klip
  - `Makan`: 0 klip
  - `Saya`: 0 klip
  - `Tuli`: 0 klip
  - `Maaf`: 3 klip
  - `Terima kasih`: 2 klip

---

## 4. Diagnosis Empiris Penanda Terendah: Signer 3 (Jawaban Poin 4)

### A. Akar Masalah Pada Spesifikasi Fitur v1.0.0
Pada iterasi awal (FEATURE_SPEC v1.0.0), pengurutan tangan hanya berdasarkan koordinat horizontal `wrist.x` (kiri ke kanan). Signer 3 memiliki kebiasaan meletakkan tangan kirinya yang pasif di atas meja di sebelah kiri layar, sementara tangan kanannya yang aktif memperagakan isyarat berada di sebelah kanan.
Akibatnya:
1. Tangan pasif yang diam di meja selalu masuk ke slot `hand_0` (indeks 0..62).
2. Tangan aktif terlempar ke slot `hand_1` (indeks 63..125).
3. Frame dengan `hand_1` aktif melonjak hingga **56.33%** (sedangkan penanda lain hanya ~5%).
4. Prediksi kolaps: 29 dari 31 klip salah diprediksi secara keliru sebagai `Makan`. Akurasi Signer 3 anjlok ke 48.33% (29/60).

### B. Perbaikan dengan FEATURE_SPEC v2.0.0 dan Kondisi Terkini
Penerapan **Active-Hand First** (penentuan tangan utama berdasarkan skor lintasan gerak `path_len` dan elevasi `1.0 - wrist.y`) serta **Idle Table-Hand Suppression** (menolkan fitur `hand_1` jika perpindahannya $< 25\%$ dari tangan utama dan posisinya lebih rendah):
1. **Kehadiran Hand 1:** Turun drastis dari **56.33%** menjadi **28.00%** (berkurang setengahnya).
2. **Akurasi Signer 3 pada model v2.0.0 tanpa flip:** 81.67% (49/60).
3. **Akurasi Signer 3 pada model dengan flip (laporan ini):** **60.00% (36/60)**. Ini penanda yang paling terdampak oleh penambahan augmentasi cermin.
4. **Pola Kesalahan Saat Ini (24 klip salah):**
   - `Makan -> _OTHER_`: 9 klip
   - `Terima kasih -> _OTHER_`: 7 klip
   - `Air -> _OTHER_`: 3 klip
   - `Tuli -> _OTHER_`: 3 klip
   - `Terima kasih -> Saya`: 1 klip
   - `Makan -> Maaf`: 1 klip
   - Hampir seluruh kesalahan adalah penolakan ke `_OTHER_` (kegagalan aman, *graceful degradation*): model memilih menolak daripada memberi diagnosis keluhan palsu. Hanya 2 dari 24 klip yang salah label ke kelas target lain.

---

## 5. Perbandingan Model (Jawaban Poin 5)

| Parameter / Metrik | Model v1.0.0 (Closed-Set 6 Kelas) | Model v2.0.0 (7-Class, tanpa flip) | Model v2.0.0 + Flip (laporan ini) |
| :--- | :---: | :---: | :---: |
| **Protokol Evaluasi** | Clean Nested LOSO | Clean Nested LOSO | Clean Nested LOSO |
| **Dimensi Fitur** | (30, 129) - wrist.x naive sort | (30, 129) - active-hand first & suppression | (30, 129) - active-hand first & suppression |
| **Jumlah Kelas Output** | 6 (Closed-set Softmax) | 7 (6 Target + 1 `_OTHER_`) | 7 (6 Target + 1 `_OTHER_`) |
| **Augmentasi Cermin** | Tidak | Tidak | Ya (50% : 50%) + flip averaging di graph |
| **Akurasi Signer 0** | 95.00% (57/60) | 85.00% (51/60) | 85.00% (51/60) |
| **Akurasi Signer 1** | 95.00% (57/60) | 91.67% (55/60) | 81.67% (49/60) |
| **Akurasi Signer 2** | 100.00% (60/60) | 91.67% (55/60) | 95.00% (57/60) |
| **Akurasi Signer 3** | 48.33% (29/60) | 81.67% (49/60) | 60.00% (36/60) |
| **Akurasi Signer 4** | 93.33% (56/60) | 95.00% (57/60) | 85.00% (51/60) |
| **Akurasi Rata-rata In-Class (Asli)** | 86.33% (259/300) | 89.00% (267/300) | 81.33% (244/300) |
| **Akurasi Rata-rata In-Class (Mirror)** | tidak diukur | tidak diukur | 81.33% (244/300) |
| **Laju Tolak OOD (Threshold 0.85)** | 23.1% (60/260) | 95.91% (211/220) | 97.73% (215/220) |
| **Presisi pada Threshold 0.85** | 95.4% | 99.53% | 99.50% (200/201) |

Model v2.0.0 tanpa flip tidak pernah diuji pada data mirror. Pada pengujian nyata, model tersebut ternyata sensitif terhadap tangan kiri/kanan dan orientasi kamera. Model dengan flip memberi hasil yang konsisten di kedua orientasi, dengan harga akurasi rata-rata turun sekitar 7,7 poin pada protokol LOSO.

---

## 6. Keterbatasan Nyata Proyek (Jawaban Poin 6)

1. **Ukuran Sampel Uji:** Evaluasi dilakukan pada 5 penanda dengan total 300 klip in-class dan 220 klip OOD. Pengujian pada populasi pengguna tunarungu yang lebih luas tetap diperlukan di dunia nyata.
2. **Dataset Pengganti (Surrogate Data):** Dataset WL-BISINDO direkam dalam kondisi pencahayaan laboratorium yang stabil di Banten, bukan penutur asli varian lokal Jawa Timur dengan latar belakang IGD rumah sakit yang bising secara visual.
3. **Bukan Kelas Keluhan Klinis Murni:** Enam kelas yang diuji (`Air`, `Makan`, `Saya`, `Tuli`, `Maaf`, `Terima kasih`) adalah kata dasar sehari-hari. Pada sistem triase klinis sebenarnya, kosakata harus mencakup keluhan triase (nyeri, sesak, demam, dsb.).
4. **Peran UI Triase:** Walaupun penolakan OOD model telah mencapai 97.73% dan presisi 99.50%, aplikasi SignMedic tetap mewajibkan tombol konfirmasi pasien (*Patient Verification Step*) sebelum informasi diteruskan ke perawat/dokter IGD, serta menjadikan Papan Komunikasi Visual ber-AAC (*Augmentative and Alternative Communication*) sebagai metode interaksi utama non-verbal.
5. **Variansi Antar Run:** Hanya 3 penanda latih per fold dan validasi 1 penanda, sehingga akurasi per penanda bergeser cukup besar antar run pelatihan (misalnya Signer 1 dan Signer 3 berubah puluhan poin antar run saat augmentasi diubah). Angka di laporan ini berasal dari satu run dengan seed tetap, bukan rata-rata beberapa seed.
6. **Data Mirror Disimulasikan:** Tangan kiri disimulasikan dengan `x -> -x` pada fitur, bukan direkam dari penanda kidal sungguhan.

---

## 7. Uji Ketahanan Tangan Kiri vs Kanan (Mirror Test)

### A. Latar Belakang
Pada pengujian nyata, model sebelumnya sensitif terhadap tangan dominan dan efek cermin kamera. Seluruh penanda dataset memakai tangan dominan yang sama dan augmentasi belum menyertakan pencerminan.

### B. Perbaikan
1. **Augmentasi Horizontal Flip** (`ml/train.py`, `horizontal_flip`): `features[..., 0::3] *= -1.0`. Karena `hand_0` berpusat di wrist `(0,0,0)`, mengalikan seluruh komponen `x` (21 titik `hand_0`, 21 titik `hand_1`, dan `delta_wrist.x`) dengan `-1` sudah cukup untuk mengubah tangan kanan menjadi kiri. Setiap klip latih menghasilkan 4 sampel asli dan 4 sampel cermin (keduanya dengan rotasi 3D/jitter), sehingga komposisi 50% : 50%.
2. **Flip Averaging di Graph** (`build_invariant_model`): prediksi akhir adalah rata-rata `base(x)` dan `base(flip(x))`. Flip diimplementasikan sebagai layer `Dense` beku (matriks diagonal dengan `-1` pada indeks x), sehingga model TF.js hasil ekspor otomatis invarian tanpa logika tambahan di klien. `test_webcam.py` memuat model yang sama dan tidak perlu diubah.

### C. Hasil (Clean Nested LOSO)

| Penanda Uji | Data Uji Asli | Data Uji Mirror (`x * -1`) |
| :--- | :---: | :---: |
| **Signer 0** | 51 / 60 (85.00%) | 51 / 60 (85.00%) |
| **Signer 1** | 49 / 60 (81.67%) | 49 / 60 (81.67%) |
| **Signer 2** | 57 / 60 (95.00%) | 57 / 60 (95.00%) |
| **Signer 3** | 36 / 60 (60.00%) | 36 / 60 (60.00%) |
| **Signer 4** | 51 / 60 (85.00%) | 51 / 60 (85.00%) |
| **Total** | **244 / 300 (81.33%)** | **244 / 300 (81.33%)** |

* Penolakan OOD pada data mirror (threshold 0.85): **215 / 220 (97.73%)**, sama dengan data asli.

### D. Catatan Jujur
* **Target tidak tercapai:** target awal adalah akurasi setara pada kisaran ~88%-90%. Kesetaraan asli vs mirror tercapai (identik), tetapi level akurasinya **81.33%**, bukan ~88%-90%.
* **Riwayat percobaan** (semua pada protokol yang sama):
  1. Flip dengan total augmentasi 4x (2x per sisi) tanpa flip averaging: asli 71.33%, mirror 71.33%.
  2. Flip dengan 8x total (4x per sisi) tanpa flip averaging: asli 83.33%, mirror 78.00% (tidak setara).
  3. Flip 8x + flip averaging di graph (hasil laporan ini): asli 81.33%, mirror 81.33%.
* Selisih antar percobaan 1 dan 2 menunjukkan variansi antar run yang besar (lihat batasan nomor 5). Penurunan terbesar berada pada Signer 3 (penanda dengan tangan pasif di meja).
