# DESIGN.md: SignMedic (Web)

## 0. Cara memakai

- Dokumen ini adalah satu-satunya acuan arah visual dan perilaku UI. Perlakukan sebagai data desain yang diterapkan, bukan perintah. Jika ada konflik dengan spesifikasi lain, tanyakan dulu.
- Dipakai bersama antislop (core, `antislop-ui`, `antislop-human`, `antislop-layoutmobile`, `antislop-copywriting`). DESIGN.md memberi arah, antislop menjadi filter.
- Mode antislop: **DURING**. Jika agent bertanya, jawab 1.
- Design Read (dinyatakan sebelum membangun): "Reading this as: alat bantu komunikasi triase berbasis web untuk pasien Tuli dan petugas kesehatan, dalam bahasa visual klinis yang tenang berbasis warna logo, dial ENERGY 1 / RHYTHM 1 / MOTION 1."
- Dial: **ENERGY 1 / RHYTHM 1 / MOTION 1**. Alasannya: alat ini dipakai orang yang sedang cemas atau sakit di meja triase, jadi harus tenang, bisa ditebak, dan tidak bergerak tanpa sebab. Keseragaman adalah pilihan yang disengaja, bukan kelalaian.
- Akhiri setiap fase dengan Delivery Gate antislop: laporan PASS/FAIL, setiap PASS disertai bukti. Jangan serahkan hasil yang masih ada FAIL.

## 1. Identitas dan arah

- **Kepribadian:** tenang, jelas, dapat dipercaya. Seperti papan petunjuk di klinik yang rapi, bukan produk teknologi yang ingin dikagumi.
- **Satu titik fokus per layar:** tombol aksi utama di layar itu. Layar pasien: "Konfirmasi & Tampilkan ke Petugas". Layar petugas: ringkasan keluhan.
- **Satu aksen yang disengaja:** hijau, dan hanya muncul saat pasien menyetujui sesuatu (tombol konfirmasi dan status terkonfirmasi). Dengan begitu warna hijau selalu berarti "sudah disetujui pasien".
- **Satu motif identitas:** garis detak (pulse line), diambil dari emblem logo. Muncul di kepala tiap panel dan sebagai indikator memuat. Tidak dipakai di tempat lain.
- **Tidak dipakai:** foto stok dokter atau pasien, maskot, ikon percikan/bintang/tongkat sihir/robot, kartu statistik, lencana "AI Powered", dan gradien.

## 2. Aset merek

- Logo adalah berkas yang diberikan tim. Simpan sebagai `web/public/brand/signmedic-logo.png`. Jangan menggambar ulang, menjiplak, atau membuat varian baru (R-23). Jika berkas belum ada, tampilkan teks "SignMedic" dan tanyakan.
- Tampilkan di header dengan tinggi 48px di atas pelat putih (radius 14px, padding 8px) pada kedua mode, supaya tulisan navy tetap terbaca di mode gelap.
- Teks alternatif: "SignMedic".
- Gradien hanya ada di dalam logo. UI memakai warna solid (R-01).

Warna yang diambil dari logo (diukur dari berkas): navy `#142C58` (tulisan SIGNMEDIC), biru `#2F76A9`, biru muda `#3D9FD5`, hijau `#52A448`. Untuk teks dan tombol, UI memakai turunan yang lebih gelap supaya lulus kontras (bagian 3). Warna asli logo hanya untuk logo dan overlay landmark tangan (grafis, bukan teks).

## 3. Design tokens

Definisikan sebagai CSS variables di `:root`, petakan ke `tailwind.config` (`theme.extend.colors`). Jangan menulis hex di komponen. Palet inti: navy dan biru, aksen hijau, ditambah netral. Merah hanya untuk galat dan kebutuhan mendesak (warna semantik, bukan dekorasi). Tidak ada warna ke-5 (R-29).

| Token | Terang | Gelap | Fungsi |
|---|---|---|---|
| `--bg` | #EAF1F7 | #0A1428 | latar halaman |
| `--surface` | #FFFFFF | #101F3D | panel, kartu |
| `--soft` | #F3F7FB | #162A4D | kartu bersarang, input |
| `--ink` | #142C58 | #E8EFF8 | teks utama |
| `--muted` | #51637D | #A3B4CC | teks sekunder (hanya di `--surface` atau `--soft`) |
| `--brand` | #142C58 | #8CC6EE | tombol utama, item terpilih, cincin fokus |
| `--brand-ink` | #FFFFFF | #0A1B38 | teks di atas `--brand` |
| `--tint` | #DCEAF5 | #1D3A63 | chip, bubble pesan, tombol sekunder, pita kepala panel |
| `--line` | #D3DEE9 | #29426B | garis dekoratif antar-bagian |
| `--edge` | #7C90AB | #6F86A8 | batas kontrol interaktif (tile, input, tombol pertanyaan) |
| `--blue` | #2A6A99 | #7DB9E6 | teks status kandidat, tautan, motif garis detak |
| `--accent` | #22753A | #5BBF73 | tombol dan status persetujuan pasien |
| `--accent-ink` | #FFFFFF | #07210F | teks di atas `--accent` |
| `--ok-bg` / `--ok-text` | #E2F2E5 / #1B5E2F | #143A24 / #8BE3A3 | badge terkonfirmasi |
| `--err` | #B3261E | #FFB4AB | galat, tile "Butuh bantuan segera" |
| `--err-bg` | #FDECEA | #3B1512 | latar pesan galat |
| `--err-ink` | #FFFFFF | #3B1512 | teks di atas isian `--err` |

Dark mode mengikuti `prefers-color-scheme`. `data-theme="light|dark"` di `<html>` hanya untuk pengujian. Tema terang adalah bawaan karena ruang triase terang dan teks cetak biru-navy paling terbaca di sana (R-21). Kedua mode wajib berfungsi penuh dan diuji (R-34).

**Kontras terverifikasi** (dihitung dari nilai di atas). Hanya pasangan ini yang boleh dipakai untuk teks. Pasangan lain harus dihitung dan ditambahkan dulu.

| Pasangan | Terang | Gelap |
|---|---|---|
| ink di bg / surface / soft / tint | 12,03 / 13,72 / 12,74 / 11,19 | 15,86 / 14,11 / 12,31 / 9,87 |
| muted di surface / soft | 6,12 / 5,69 | 7,75 / 6,76 |
| brand-ink di brand | 13,72 | 9,31 |
| blue di surface / soft | 5,80 / 5,39 | 7,74 / 6,76 |
| blue di tint | 4,73 | belum diverifikasi, jangan dipakai |
| accent-ink di accent | 5,72 | 7,41 |
| ok-text di ok-bg | 6,72 | 8,20 |
| err di err-bg / surface | 5,72 / 6,54 | 9,50 / 9,62 |
| err-ink di err | 6,54 | 9,50 |
| edge di surface / soft (batas ≥ 3:1) | 3,26 / 3,03 | 4,40 / 3,84 |
| brand di surface / bg (cincin fokus ≥ 3:1) | 13,72 / 12,03 | 8,89 / 9,99 |

## 4. Tipografi

- Plus Jakarta Sans (Google Fonts, bobot 500/600/700/800), fallback `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Alasan: huruf humanis dengan bukaan lebar, terbaca jelas pada ukuran besar, dan mendukung teks Indonesia dengan baik (R-06).
- Skala: h1 28px/1,15/800 (25px di layar ≤ 900px); h2 16px/700; label grup 14px/700 `--muted`; badan 16px/1,45; label tile 15px/600; chip 14px/600; badge 13px/700; pesan petugas 18px/600; kandidat gestur 26px/800.
- Sentence case. Tanpa huruf kapital semua dan tanpa letter-spacing lebar. Tanpa font monospace.

## 5. Bentuk, jarak, bayangan

- **Skala radius (variasi disengaja, R-11):** badge 10px; kontrol (tombol, input, tab/segmen) 14px; tile dan bubble pesan 20px; kartu 24px; panel 32px. Hanya chip ringkasan yang berbentuk pil (999px), karena ia memang "token" yang bisa dilepas.
- Jarak berbasis 4px. Padding kartu 18px. Jarak antar-tile 10px, antar-bagian 16px, antar-panel 24px.
- Batas kontrol interaktif memakai `--edge` 1,5px. Garis dekoratif memakai `--line` 1px.
- Bayangan hanya pada panel di layar lebar sebagai penanda kedalaman antar-panel dan latar: `0 12px 34px rgba(20,44,88,.12)` (gelap `rgba(0,0,0,.4)`). Kartu bersarang tanpa bayangan. Tanpa glow dan tanpa glassmorphism.
- Gerak: tile saat ditekan `scale(.98)` 150ms, dan garis detak saat memuat. Tanpa animasi masuk. `prefers-reduced-motion: reduce` mematikan semuanya, garis detak menjadi statis.

## 6. Layout

- Kontainer maksimum 1180px, di tengah, padding samping 16px. `viewport-fit=cover` dan `env(safe-area-inset-*)` untuk padding atas dan bawah.
- **≥ 901px:** dua panel berdampingan (Layar Pasien kiri, Layar Petugas kanan).
- **≤ 900px:** satu panel per waktu, dipilih lewat kontrol segmen "Layar Pasien | Layar Petugas" di header. Tidak ada overflow horizontal, target sentuh ≥ 48px (R-03).
- Header halaman: logo (bagian 2) di kiri, kontrol segmen di kanan (hanya di layar sempit).
- Kepala panel: pita datar `--tint` dengan penanda layar, judul, satu kalimat petunjuk, dan garis detak di sisi kanan.
- Di bawah header: satu baris catatan batasan (bagian 10).

## 7. Komponen

Semua komponen interaktif: tinggi sentuh ≥ 48px, cincin fokus `outline: 3px solid var(--brand)` dengan `outline-offset: 3px`, dapat dioperasikan dengan keyboard. Dilarang `outline: none` tanpa pengganti.

- **Tile papan visual:** radius 20px, batas `--edge`, latar `--surface`. Ikon di atas, label di bawah, rata kiri, tinggi minimum 92px. Grid `repeat(auto-fill, minmax(128px, 1fr))`. Terpilih: latar `--brand`, teks `--brand-ink`, lencana centang di pojok. `aria-pressed` wajib. Pilihan tidak dibedakan hanya dengan warna, centang adalah penandanya.
- **Tile "Butuh bantuan segera":** satu-satunya tile selebar penuh, ditaruh paling atas papan, batas `--err` 2px, ikon dan label `--err`. Terpilih: isian `--err` dengan teks `--err-ink`. Alasan hierarkinya: ini kebutuhan paling mendesak.
- **Chip ringkasan:** pil `--tint`, ikon dan label, tombol hapus "×" 26px dengan `aria-label="Hapus {label}"` (hanya di layar pasien).
- **Badge status:** radius 10px, selalu ada ikon dan teks.
  - Kandidat Prediksi AI dan Belum dikonfirmasi: garis putus-putus 1,5px `--blue`, latar `--surface`, teks `--blue`, ikon lingkaran putus-putus.
  - Telah Dikonfirmasi Pasien: isian `--ok-bg`, teks `--ok-text`, ikon centang.
  Dibedakan lewat bentuk garis, ikon, dan teks, bukan hanya warna.
- **Tombol:** radius 14px. Utama `--brand`. Persetujuan `--accent` (hanya untuk "Konfirmasi" dan "Konfirmasi & Tampilkan ke Petugas"). Sekunder `--tint` dengan teks `--ink`. Disabled: opasitas 50%, `cursor: not-allowed`, `aria-disabled`.
- **Kontrol tab dan segmen:** wadah `--soft` radius 14px dengan batas `--edge`. Item aktif `--brand`.
- **Kartu:** `--soft`, garis `--line` 1px, radius 24px, padding 18px.
- **Kartu ringkasan:** judul dan badge di baris atas, isi dikelompokkan per kategori (label kecil `--muted`, lalu chip), tombol aksi di bawah.
- **Tombol pertanyaan cepat:** lebar penuh, rata kiri, batas `--edge` 1,5px, radius 14px, teks 600.
- **Bidang tulis pesan:** input radius 14px, tombol mikrofon, tombol "Kirim". Catatan "tidak didukung" tampil di bawahnya bila perlu.
- **Bubble pesan petugas:** `--tint`, radius `20px 20px 20px 6px`, teks 18px/600, pesan terbaru di atas.
- **Panel kamera:** rasio 16:10, latar datar `#142C58` pada kedua mode, overlay landmark biru muda `#3D9FD5` dan titik putih, teks status di bawah. Tanpa tombol "simulasi" di produk.
- **Kotak kandidat gestur:** badge Kandidat Prediksi AI, label kandidat 26px/800, tombol "Konfirmasi" (aksen) dan "Batal / Ubah Manual" (sekunder). **Jangan menampilkan persentase keyakinan.** Skor model bukan probabilitas sungguhan dan angkanya akan terbaca sebagai klaim akurasi (R-17).
- **Keadaan kosong:** kotak putus-putus `--line`, teks `--muted`, satu kalimat arah tindakan.

**Ikon (R-04):** satu set `lucide-react` lewat `src/ui/iconMap.ts` yang memetakan id katalog ke ikon. Pilih yang konsepnya paling dekat dan verifikasi namanya ada di versi terpasang. Jika tidak ada ikon yang tepat, tidak memakai ikon (label tetap ada).

| Item | Konsep ikon |
|---|---|
| Sakit / Nyeri, Mual, Pusing, Sesak napas | wajah meringis, wajah mual, putaran, angin |
| Kepala, Dada, Perut, Tangan / Kaki | siluet kepala, hati, lingkaran perut, tangan |
| Butuh bantuan segera, Ingin duduk / berbaring, Butuh pendamping | sirene, kursi, dua orang |
| Memiliki alergi obat / makanan, Minum obat rutin | segitiga peringatan, kapsul |
| Ya, Tidak, Saya belum mengerti | centang, silang, tanda tanya |
| Gestur Kamera, Papan Visual, Mikrofon | tangan, kisi gambar, mikrofon |
| Rapikan jadi kalimat (Fase 5) | pena menulis |

Ikon dekoratif (`aria-hidden`), selalu berpasangan dengan label teks. Dilarang ikon percikan, bintang, tongkat sihir, kilat, berlian, robot.

## 8. Layar

**Layar Pasien**, dari atas:
1. Kepala panel: penanda "Layar Pasien", judul "Apa yang Anda rasakan?", satu kalimat petunjuk.
2. Tab: "Papan Visual" | "Gestur Kamera".
3. Papan visual: tile "Butuh bantuan segera" selebar penuh, lalu grup Keluhan utama, Lokasi tubuh, Kebutuhan triase (duduk/berbaring, pendamping), Informasi penting, Konfirmasi cepat. Atau panel kamera.
4. Kartu "Ringkasan Keluhan": chip per kategori, badge status, tombol "Konfirmasi & Tampilkan ke Petugas" (nonaktif jika kosong atau sudah dikonfirmasi), tombol "Ubah ringkasan" setelah konfirmasi.
5. Kartu "Pesan dari Petugas".

**Layar Petugas**, dari atas:
1. Kepala panel: penanda "Layar Petugas Triase", judul "Ringkasan dari pasien", satu kalimat batasan klinis.
2. Kartu "Confirmed Symptom Summary": kosong sampai pasien konfirmasi, lalu terkelompok dengan badge terkonfirmasi.
3. Kartu "Pertanyaan cepat": lima tombol.
4. Kartu "Ketik atau ucapkan": input, mikrofon, kirim, dan jejak pesan terkirim.
5. Tombol "Akhiri sesi dan hapus data".
6. Tombol "Rapikan jadi kalimat" hanya setelah Fase 5 berfungsi dan ada ringkasan terkonfirmasi.

## 9. Status dan keadaan (wajib, R-27)

| Area | Keadaan | Tampilan |
|---|---|---|
| Model gestur | memuat | garis detak beranimasi, "Menyiapkan pengenalan gestur." |
| | gagal dimuat | pesan netral "Pengenalan gestur tidak tersedia. Gunakan Papan Visual." dan tombol "Buka Papan Visual" |
| Kamera | belum diizinkan | "Kamera belum aktif." dan tombol "Aktifkan kamera" |
| | ditolak atau tidak ada | "Kamera tidak bisa dipakai. Papan Visual tetap bisa digunakan." |
| Kandidat | di bawah ambang | "Gestur belum dikenali dengan yakin. Silakan gunakan Papan Komunikasi Visual." |
| Ringkasan | kosong, terisi, terkonfirmasi | lihat komponen. Kosong: "Belum ada pilihan. Pilih pada papan gambar." |
| Layar petugas | menunggu | "Menunggu pasien mengonfirmasi ringkasan keluhan." |
| Speech-to-Text | tidak didukung | catatan "Speech-to-Text tidak tersedia di browser ini. Gunakan pertanyaan cepat atau ketik manual." |
| | mendengarkan | tombol mikrofon bercincin, label "Mendengarkan" |
| | izin ditolak atau galat | "Mikrofon tidak bisa dipakai. Ketik pesan atau pilih pertanyaan cepat." |
| Pesan petugas | kosong | "Belum ada pesan dari petugas." |
| Saran kalimat (Fase 5) | memuat, gagal, timeout | indikator memuat; saat gagal tampilkan ringkasan templat dari item asli dengan catatan "Saran kalimat tidak tersedia." |

Galat memakai `--err` pada `--err-bg` dengan ikon dan teks. Pesan menjelaskan apa yang terjadi dan langkah berikutnya, tanpa menyalahkan pengguna.

## 10. Teks (bahasa Indonesia)

- Catatan di bawah header: "Alat bantu komunikasi awal, bukan alat diagnosis. Data hanya tersimpan di memori halaman ini."
- Kalimat sederhana, kata kerja aktif, sentence case. Tombol menyebut apa yang terjadi. Tanpa tanda pisah em dash, tanpa istilah pemasaran seperti "AI Powered" atau "Seamless", tanpa CTA generik ("Mulai", "Pelajari lebih lanjut").
- Katalog pesan (sumber: `web/shared/catalog.json`, label tidak boleh diubah tanpa persetujuan):
  - Keluhan utama: Sakit / Nyeri, Mual, Pusing, Sesak napas
  - Lokasi tubuh: Kepala, Dada, Perut, Tangan / Kaki
  - Kebutuhan triase: Butuh bantuan segera, Ingin duduk / berbaring, Butuh pendamping
  - Informasi penting: Memiliki alergi obat / makanan, Minum obat rutin
  - Konfirmasi cepat: Ya, Tidak, Saya belum mengerti
- Pertanyaan cepat petugas:
  1. Apa keluhan utama yang Anda rasakan?
  2. Bagian tubuh mana yang terasa sakit?
  3. Sejak kapan keluhan ini dirasakan?
  4. Apakah Anda memiliki riwayat alergi obat?
  5. Silakan tunggu sebentar, kami akan memeriksa Anda.
- Tidak ada angka statistik, testimoni, FAQ, tautan navigasi ke halaman yang belum ada, atau klaim keamanan dan akurasi (R-17, R-18, R-24, R-28, R-36).

## 11. Perilaku dan aksesibilitas

- Memilih atau menghapus item setelah konfirmasi membatalkan status konfirmasi, dan layar petugas kembali ke keadaan menunggu. Konfirmasi menyalin item terpilih sebagai snapshot.
- Kandidat gestur masuk ringkasan hanya setelah pasien menekan "Konfirmasi".
- State hanya di memori. Dilarang localStorage, sessionStorage, IndexedDB, dan cookie. "Akhiri sesi" menghapus semuanya. Dua tab tersinkron lewat BroadcastChannel.
- `lang="id"`, urutan Tab mengikuti urutan visual, tombol dapat diaktifkan dengan Enter atau Spasi, dialog (bila ada) tertutup dengan Escape.
- Informasi penting tidak pernah disampaikan hanya lewat warna atau suara. Status dinamis (pesan baru, kandidat) diumumkan lewat `aria-live="polite"`.
- Semua tombol ikon punya `aria-label`. Teks tidak lebih kecil dari 13px.
- Hormati `prefers-reduced-motion` dan `prefers-color-scheme`.

## 12. Alasan keputusan (R-31)

| Keputusan | Alasan satu baris |
|---|---|
| Navy, biru, hijau | Diambil dari logo supaya UI terasa satu keluarga dengan merek. |
| Hijau hanya untuk persetujuan | Satu makna per warna: hijau berarti "pasien sudah setuju". |
| Merah hanya galat dan kebutuhan mendesak | Dua keadaan yang tidak boleh terlewat. |
| Tanpa gradien di UI | Gradien milik logo. UI solid agar kontras mudah diverifikasi. |
| Radius bertingkat | Ukuran radius mengikuti hierarki: tile dan kartu lebih besar dari kontrol, hanya chip yang pil. |
| Bayangan hanya di panel | Memisahkan dua layar dari latar, tidak ada elemen lain yang perlu terlihat melayang. |
| Tile bantuan segera selebar penuh di atas | Kebutuhan paling mendesak harus yang pertama terlihat dan paling mudah ditekan. |
| Tema terang bawaan, gelap lewat OS | Ruang triase terang, dan mode gelap membantu pengguna yang sensitif cahaya. |
| Garis detak sebagai motif | Berasal dari emblem logo dan sekaligus menjadi penanda proses memuat. |
| Plus Jakarta Sans | Terbaca jelas di ukuran besar dan ramah untuk teks Indonesia. |
| Tanpa persentase keyakinan | Skor model bukan probabilitas, angkanya menyesatkan pasien. |
| Ikon `lucide-react` | Satu gaya yang konsisten, dan tampil sama di semua perangkat. |

## 13. Kriteria selesai

- Kedua layar sesuai bagian 6 pada lebar 1280px dan 390px, tanpa overflow horizontal.
- Alur lengkap tanpa kamera, mikrofon, dan internet: pilih, ringkasan, konfirmasi, tampil di petugas, petugas membalas, pasien membaca, akhiri sesi.
- Setiap keadaan di bagian 9 dapat dipicu dan tampil sesuai tabel.
- Seluruh pasangan warna sesuai tabel kontras, di mode terang dan gelap, dan kedua mode berfungsi penuh.
- Fokus keyboard terlihat di semua komponen interaktif. Semua elemen interaktif diuji, konsol bersih (R-35).
- Delivery Gate antislop dijalankan dan dilampirkan dengan bukti per item.
