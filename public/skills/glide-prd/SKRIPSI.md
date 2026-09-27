# Struktur Skripsi / Tugas Akhir Sistem Informasi

Referensi struktur dan template per bab untuk skripsi atau tugas akhir bidang Sistem Informasi (SI) / Rekayasa Perangkat Lunak (RPL).

---

## Struktur 5 Bab

| Bab | Judul | Isi Utama |
|-----|-------|-----------|
| BAB I | PENDAHULUAN | Latar Belakang, Rumusan Masalah, Tujuan & Manfaat, Batasan Masalah |
| BAB II | LANDASAN TEORI | Metode pengembangan, diagram UML/ERD, teknologi yang digunakan |
| BAB III | ANALISIS DAN PERANCANGAN | Analisis sistem berjalan, kebutuhan fungsional/non-fungsional, pemodelan, desain DB, wireframe UI |
| BAB IV | IMPLEMENTASI DAN PENGUJIAN | Screenshot aplikasi, lingkungan pengembangan, Black Box Testing |
| BAB V | PENUTUP | Kesimpulan (menjawab Bab I), Saran pengembangan |

---

## Penamaan File Section

```
sections/
├── 00a-kata-pengantar.typ
├── 00b-daftar-isi.typ
├── 00c-daftar-gambar.typ
├── 01-pendahuluan.typ
├── 02-landasan-teori.typ
├── 03-analisis-perancangan.typ
├── 04-implementasi-pengujian.typ
├── 05-penutup.typ
└── 11-daftar-pustaka.typ
```

---

## Template Per Bab

### BAB I — Pendahuluan (`01-pendahuluan.typ`)

```typst
#glide-bab(toc: [BAB I - PENDAHULUAN])[BAB I \\ PENDAHULUAN]

== 1.1 Latar Belakang

[Jelaskan kondisi/masalah yang terjadi di organisasi atau di lapangan sebelum
aplikasi ini ada. Gunakan data atau fakta pendukung jika tersedia. Minimal 3
paragraf: (1) kondisi umum, (2) masalah spesifik, (3) solusi yang diusulkan.]

== 1.2 Rumusan Masalah

Berdasarkan latar belakang di atas, rumusan masalah dalam penelitian ini adalah:

+ Bagaimana merancang dan membangun aplikasi [nama aplikasi] yang dapat [fungsi utama]?
+ Bagaimana [pertanyaan teknis spesifik, misal: cara kerja autentikasi/laporan]?

== 1.3 Tujuan dan Manfaat

=== 1.3.1 Tujuan

Tujuan dari penelitian ini adalah:

+ Merancang dan membangun aplikasi [nama aplikasi] untuk [tujuan utama].
+ [Tujuan tambahan jika ada.]

=== 1.3.2 Manfaat

*Bagi Pengguna:*

+ [Manfaat konkret bagi pengguna akhir.]

*Bagi Institusi/Organisasi:*

+ [Manfaat bagi pihak yang menggunakan sistem.]

== 1.4 Batasan Masalah

Agar penelitian ini tetap terfokus, batasan masalah yang ditetapkan adalah:

+ Aplikasi ini hanya mencakup [fitur yang ada], tidak mencakup [fitur yang tidak ada].
+ Aplikasi dibangun menggunakan [teknologi utama].
+ Pengujian dilakukan menggunakan metode _Black Box Testing_.
```

---

### BAB II — Landasan Teori (`02-landasan-teori.typ`)

```typst
#glide-bab(toc: [BAB II - LANDASAN TEORI])[BAB II \\ LANDASAN TEORI]

== 2.1 [Metode Pengembangan Sistem]

[Contoh: Waterfall, Agile, Scrum. Jelaskan teori dan tahapan metode yang dipakai.]

Menurut @pressman_2015, metode _waterfall_ adalah ...

#glide-figure("images/waterfall.png", "Diagram Tahapan Metode Waterfall")

== 2.2 Unified Modeling Language (UML)

_Unified Modeling Language_ (UML) adalah bahasa pemodelan standar yang digunakan
untuk memvisualisasikan, merancang, dan mendokumentasikan sistem perangkat lunak
@uml_docs.

=== 2.2.1 Use Case Diagram

[Penjelasan singkat tentang use case diagram.]

=== 2.2.2 Activity Diagram

[Penjelasan singkat tentang activity diagram.]

=== 2.2.3 Entity Relationship Diagram (ERD)

[Penjelasan singkat tentang ERD dan hubungan antar entitas.]

== 2.3 [Teknologi yang Digunakan]

=== 2.3.1 [Bahasa Pemrograman / Framework]

[Penjelasan tentang teknologi utama: PHP/Laravel, Flutter, Python/Django, dll.]

=== 2.3.2 [Basis Data]

[Penjelasan tentang DBMS yang digunakan: MySQL, PostgreSQL, SQLite, dll.]
```

---

### BAB III — Analisis dan Perancangan (`03-analisis-perancangan.typ`)

```typst
#glide-bab(toc: [BAB III - ANALISIS DAN PERANCANGAN])[BAB III \\ ANALISIS DAN PERANCANGAN SISTEM]

== 3.1 Analisis Sistem Berjalan

[Jelaskan bagaimana proses kerja yang terjadi saat ini (sebelum ada aplikasi).
Gunakan narasi atau diagram alur untuk menggambarkan alur kerja manual yang ada.]

== 3.2 Analisis Kebutuhan Sistem

=== 3.2.1 Kebutuhan Fungsional

Kebutuhan fungsional sistem adalah sebagai berikut:

+ Admin dapat mengelola data [entitas utama] (tambah, ubah, hapus, lihat).
+ Pengguna dapat melakukan [aksi utama pengguna].
+ Sistem dapat menghasilkan laporan [jenis laporan].

=== 3.2.2 Kebutuhan Non-Fungsional

#glide-table(caption: "Kebutuhan Non-Fungsional Sistem")[
  #table(
    columns: (auto, 1fr),
    table.header[Aspek][Spesifikasi],
    [Perangkat Keras], [Prosesor minimal Intel Core i3, RAM 4 GB],
    [Sistem Operasi], [Windows 10 / Linux Ubuntu 20.04],
    [Peramban Web], [Google Chrome versi 90 ke atas],
    [Keamanan], [Autentikasi berbasis sesi dengan enkripsi _password_],
  )
]

== 3.3 Perancangan Sistem

=== 3.3.1 Use Case Diagram

#glide-figure("images/use-case.png", "Use Case Diagram Sistem [Nama Aplikasi]")

[Deskripsi singkat aktor dan use case yang terdapat pada diagram.]

=== 3.3.2 Activity Diagram

#glide-figure("images/activity-login.png", "Activity Diagram Proses Login")

[Deskripsi alur aktivitas yang digambarkan pada diagram.]

== 3.4 Perancangan Basis Data

=== 3.4.1 Entity Relationship Diagram (ERD)

#glide-figure("images/erd.png", "Entity Relationship Diagram (ERD) Sistem")

=== 3.4.2 Struktur Tabel

#glide-table(caption: "Struktur Tabel [nama_tabel]")[
  #table(
    columns: (auto, auto, auto, 1fr),
    table.header[No][Nama Field][Tipe Data][Keterangan],
    [1], [id], [INT (PK, AI)], [Kunci utama],
    [2], [nama], [VARCHAR(100)], [Nama pengguna],
    [3], [created_at], [TIMESTAMP], [Waktu data dibuat],
  )
]

== 3.5 Perancangan Antarmuka

[Tampilkan wireframe atau mockup per halaman utama. Gunakan gambar hasil
ekspor dari Figma, Balsamiq, atau tool diagram GLIDE.]

#glide-figure("images/wireframe-login.png", "Wireframe Halaman Login")

#glide-figure("images/wireframe-dashboard.png", "Wireframe Halaman Dashboard")
```

---

### BAB IV — Implementasi dan Pengujian (`04-implementasi-pengujian.typ`)

```typst
#glide-bab(toc: [BAB IV - IMPLEMENTASI DAN PENGUJIAN])[BAB IV \\ IMPLEMENTASI DAN PENGUJIAN]

== 4.1 Lingkungan Pengembangan

Spesifikasi perangkat keras dan perangkat lunak yang digunakan dalam proses
pengembangan sistem adalah sebagai berikut:

#glide-table(caption: "Spesifikasi Lingkungan Pengembangan")[
  #table(
    columns: (auto, 1fr),
    table.header[Komponen][Spesifikasi],
    [Sistem Operasi], [Windows 11 / Ubuntu 22.04],
    [Editor Kode], [Visual Studio Code 1.88],
    [Bahasa Pemrograman], [[nama bahasa dan versi]],
    [_Framework_], [[nama framework dan versi]],
    [Basis Data], [[nama DBMS dan versi]],
    [Peramban Uji], [Google Chrome 124],
  )
]

== 4.2 Hasil Implementasi Antarmuka

=== 4.2.1 Halaman Login

#glide-figure("images/ss-login.png", "Tampilan Halaman Login")

Gambar di atas menampilkan halaman _login_ sistem. Pada halaman ini, pengguna
memasukkan alamat surel dan kata sandi untuk masuk ke dalam sistem. Apabila
data yang dimasukkan tidak valid, sistem akan menampilkan pesan kesalahan.

=== 4.2.2 Halaman Dashboard

#glide-figure("images/ss-dashboard.png", "Tampilan Halaman Dashboard")

[Deskripsi fungsionalitas halaman dashboard.]

== 4.3 Pengujian Sistem

Pengujian dilakukan menggunakan metode _Black Box Testing_, yaitu pengujian
yang berfokus pada fungsionalitas sistem tanpa memperhatikan struktur kode
internal @pressman_2015.

#glide-table(caption: "Hasil Pengujian Black Box Testing")[
  #table(
    columns: (auto, 1fr, auto, auto),
    table.header[No][Skenario Uji][Hasil yang Diharapkan][Status],
    [1], [Pengguna memasukkan data login yang benar], [Berhasil masuk ke dashboard], [Berhasil],
    [2], [Pengguna memasukkan kata sandi yang salah], [Muncul pesan kesalahan], [Berhasil],
    [3], [Admin menambahkan data baru], [Data tersimpan dan muncul di daftar], [Berhasil],
  )
]
```

---

### BAB V — Penutup (`05-penutup.typ`)

```typst
#glide-bab(toc: [BAB V - PENUTUP])[BAB V \\ PENUTUP]

== 5.1 Kesimpulan

Berdasarkan hasil analisis, perancangan, implementasi, dan pengujian yang telah
dilakukan, dapat disimpulkan bahwa:

+ Aplikasi [nama aplikasi] berhasil dirancang dan dibangun untuk menyelesaikan
  masalah [masalah di Bab I].
+ Hasil _Black Box Testing_ menunjukkan bahwa seluruh fungsi utama berjalan
  sesuai dengan kebutuhan fungsional yang telah ditetapkan.
+ [Kesimpulan tambahan jika ada.]

== 5.2 Saran

Untuk pengembangan aplikasi ke depan, penulis menyarankan:

+ [Saran fitur yang bisa dikembangkan lebih lanjut.]
+ [Saran teknis: peningkatan keamanan, performa, atau skalabilitas.]
+ Dilakukan pengujian lebih lanjut dengan metode _White Box Testing_ untuk
  memastikan kualitas kode secara menyeluruh.
```

---

## Checklist Khusus Skripsi

- [ ] Rumusan masalah minimal 2 pertanyaan dan dijawab di Bab V Kesimpulan
- [ ] Setiap teori di Bab II disitasi dengan `@kunci` dari `bibliography.yaml`
- [ ] Diagram UML di Bab III menggunakan file PNG dari tool diagram GLIDE
- [ ] Setiap screenshot di Bab IV diberi deskripsi fungsionalitas minimal 2 kalimat
- [ ] Tabel Black Box Testing mencakup semua use case di Bab III
- [ ] Kesimpulan di Bab V menjawab setiap poin rumusan masalah di Bab I
