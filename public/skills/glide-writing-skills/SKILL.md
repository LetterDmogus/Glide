---
name: glide-writing-skills
description: Panduan umum penulisan dokumen formal Indonesia menggunakan GLIDE (Typst). Gunakan skill ini untuk membuat, mengisi, atau merevisi konten dokumen formal. Untuk struktur bab spesifik, rujuk ke SKRIPSI.md (skripsi/TA) atau MODUL.md (modul pembelajaran).
---

# GLIDE Writing Skills

Panduan standar untuk menyusun konten laporan formal Indonesia dalam format Typst untuk proyek GLIDE.

---

## 📁 Struktur File Proyek

Setiap proyek harus memiliki struktur folder berikut:

```
nama-proyek/
├── config.yaml           # Konfigurasi metadata dan layout
├── cover.typ             # Halaman sampul (frontmatter: layout: cover)
├── bibliography.yaml     # Data daftar pustaka
├── images/               # Semua aset gambar
└── sections/             # File .typ per bagian dokumen, diurutkan berdasarkan nama
    ├── 00a-kata-pengantar.typ
    ├── 00b-daftar-isi.typ
    ├── 00c-daftar-gambar.typ
    ├── 01-bab-pendahuluan.typ
    ├── 02-bab-isi.typ
    └── 11-daftar-pustaka.typ
```

**Aturan Penamaan Section:**
- Gunakan format `NN-nama-bagian.typ` agar file terurut secara alfabetis.
- Awalan `00x` untuk halaman-halaman awal (front matter).
- Awalan `01`, `02`, ... untuk Bab-bab utama.
- Akhiran `11` atau lebih untuk Daftar Pustaka dan Lampiran.

---

## ⚙️ Konfigurasi `config.yaml`

Isi konfigurasi standar formal Indonesia:

```yaml
title: "Judul Lengkap Laporan"
author: "Nama Penyusun"
theme: "default"

# Standar margin Indonesia (Kiri 4cm, sisanya 3cm)
margin_top: "3cm"
margin_bottom: "3cm"
margin_left: "4cm"
margin_right: "3cm"

# Tipografi
font_family: "Times New Roman"
font_size: "12pt"
line_spacing: 2.0       # 2.0 untuk laporan formal, 1.5 untuk modul/tutorial
paragraph_spacing: "1em"
heading_spacing: "1em"
text_align: "justify"
first_line_indent: "1cm"  # Indentasi baris pertama paragraf

# Nomor Halaman
page_number_style: "decimal"

# Metadata PDF
subject: "Topik atau subjek dokumen"
keywords: "kata, kunci, dokumen"
```

---

## 🏷️ Frontmatter Layout per Section

Setiap file `.typ` dapat memiliki frontmatter YAML untuk menentukan jenis halaman:

| Layout | Keterangan | Penomoran Halaman |
|--------|------------|-------------------|
| `cover` | Hanya untuk `cover.typ` | Tidak ada nomor halaman |
| `front` | Kata Pengantar, Daftar Isi, Daftar Gambar | Romawi kecil (i, ii, iii) — bawah tengah |
| `main` | Bab-bab isi dokumen (default jika tidak ada frontmatter) | Angka (1, 2, 3) — kanan atas (kecuali awal bab: bawah tengah) |

---

## 📄 Template Setiap Bagian Dokumen

### 1. Cover (`cover.typ`)

```typst
---
layout: "cover"
---
#align(center)[
  #set text(size: 12pt, weight: "bold")
  JUDUL LAPORAN BARIS PERTAMA \
  JUDUL LAPORAN BARIS KEDUA

  #v(4em)

  #image("/projects/nama-proyek/images/logo.png", width: 50%)

  #v(4em)

  #set text(size: 12pt, weight: "bold")
  Disusun oleh: \
  Nama Penyusun \
  NIS/NIM \
  Kelas atau Prodi

  #v(6em)

  Guru/Dosen Pembimbing: \
  Nama Lengkap Pembimbing, S.Pd., M.Pd.

  #v(6em)

  NAMA INSTITUSI \
  JURUSAN / PROGRAM STUDI \
  TAHUN AJARAN 2025/2026
]
```

### 2. Kata Pengantar (`00a-kata-pengantar.typ`)

```typst
---
layout: "front"
---
= KATA PENGANTAR

Puji syukur kehadirat Tuhan Yang Maha Esa atas segala rahmat dan
karunia-Nya sehingga penyusunan [nama dokumen] ini dapat diselesaikan
dengan baik.

[Paragraf isi: jelaskan tujuan dan isi dokumen secara singkat, 2-3 kalimat.]

Penulis menyadari bahwa [nama dokumen] ini masih jauh dari kata
sempurna. Oleh karena itu, kritik dan saran yang membangun sangat
diharapkan demi perbaikan di masa mendatang. Semoga [nama dokumen] ini
dapat memberikan manfaat yang maksimal bagi pembaca.

#v(2em)
#grid(
  columns: (1fr, 110pt),
  [],
  [
    Kota, Tanggal Bulan Tahun \
    Penyusun, \
    #v(2em)
    Nama Lengkap \
    NIS/NIM
  ]
)
```

### 3. Daftar Isi (`00b-daftar-isi.typ`)

```typst
---
layout: "front"
---
= DAFTAR ISI

#outline(
  title: none,
  indent: auto,
)
```

### 4. Daftar Gambar (`00c-daftar-gambar.typ`)

```typst
---
layout: "front"
---
= DAFTAR GAMBAR

#outline(
  title: none,
  target: figure.where(kind: image),
)
```

### 5. Bab Utama (`01-pendahuluan.typ`, `02-...`, dst.)

```typst
#glide-bab(toc: [BAB I - PENDAHULUAN])[BAB I \ PENDAHULUAN]

== 1.1 Judul Sub-Bab

Isi paragraf pertama. Setiap paragraf diawali dengan indentasi dan
ditulis dengan perataan _justify_. Gunakan bahasa Indonesia baku.

Isi paragraf kedua. Sambungan penjelasan topik sub-bab ini.

#glide-figure("images/nama-gambar.png", "Keterangan Gambar di Sini")

== 1.2 Judul Sub-Bab Berikutnya

Isi konten berikutnya...
```

### 6. Penutup (`10-penutup.typ`)

```typst
#glide-bab(toc: [PENUTUP])[PENUTUP]

== Kesimpulan

[Berisi rangkuman hasil yang telah dicapai dalam dokumen. Ditulis dalam
bentuk poin-poin atau paragraf yang mengacu pada kompetensi akhir di BAB I.]

+ Kesimpulan pertama yang dicapai.
+ Kesimpulan kedua yang dicapai.

== Saran

[Berisi saran pengembangan ke depan atau catatan untuk pembaca.]

Penulis berharap [nama dokumen] ini dapat terus dikembangkan dan
diperbaiki sesuai dengan perkembangan teknologi yang ada.
```

### 7. Daftar Pustaka (`11-daftar-pustaka.typ`)

```typst
= DAFTAR PUSTAKA

#glide-bib("bibliography.yaml")
```

---

## ✒️ Standar Penulisan Formal Indonesia

### Bahasa dan Gaya

- **Gunakan bahasa Indonesia baku** sesuai Ejaan Yang Disempurnakan (EYD/PUEBI).
- Hindari kata ganti orang pertama (`saya`, `aku`). Gunakan: `penulis`, `pembaca`, atau bentuk pasif (`dibuat`, `disusun`, `dijelaskan`).
- Gunakan kata baku: `unduh` (bukan _download_), `unggah` (bukan _upload_), `daring` (bukan _online_), `laman` (bukan _website_).
- Istilah asing/teknis yang belum dibakukan dicetak *miring*: `_framework_`, `_database_`, `_backend_`, `_frontend_`.
- Hindari kalimat terlalu panjang. Satu kalimat maksimal 2–3 klausa.
- Setiap paragraf minimal 3 kalimat.

### Jenis Dokumen

Struktur bab berbeda tiap jenis dokumen. Baca file referensi yang sesuai:

| Jenis Dokumen | File Referensi | Keterangan |
|---------------|----------------|------------|
| Skripsi / Tugas Akhir SI | `SKRIPSI.md` | 5 bab: Pendahuluan, Landasan Teori, Analisis & Perancangan, Implementasi, Penutup |
| Modul Pembelajaran / Praktikum | `MODUL.md` | Bab I Pendahuluan (kompetensi), Bab II–IX materi, Penutup |
| Laporan PKL | `SKRIPSI.md` | Gunakan sebagai acuan, sesuaikan judul bab dengan panduan institusi |

### Penomoran Heading

```
= BAB I            → Level 1 — SELALU gunakan #glide-bab(), bukan = langsung
== 1.1 Sub-Bab     → Level 2 — format: NomorBab.NomorSub
=== 1.1.1 ...      → Level 3 — gunakan seminimal mungkin, hindari > level 3
```

---

## 🧱 Sintaks Typst yang Umum Digunakan

### Teks Dasar

```typst
*teks tebal*           // Bold
_teks miring_          // Italic (untuk istilah asing)
`kode inline`          // Code inline
*_tebal dan miring_*   // Bold Italic
\                      // Line break manual (dalam heading/grid saja)
```

### Daftar (List)

```typst
// List bernomor (Ordered) — untuk langkah-langkah
+ Langkah pertama
+ Langkah kedua
+ Langkah ketiga

// List bullet (Unordered) — untuk poin bebas
- Item pertama
- Item kedua

// List bersarang
+ Poin utama
  - Sub-poin A
  - Sub-poin B
```

### Gambar

Selalu gunakan `#glide-figure` agar gambar masuk ke Daftar Gambar secara otomatis:

```typst
#glide-figure("images/nama-file.png", "Keterangan gambar yang jelas dan deskriptif")
```

> ⚠️ Jangan gunakan `#image()` secara langsung untuk gambar konten — gambar tidak akan masuk Daftar Gambar.

### Tabel

```typst
#glide-table(caption: "Judul Tabel yang Deskriptif")[
  #table(
    columns: (auto, 1fr, auto),
    table.header[No][Nama][Keterangan],
    [1], [Contoh data], [Keterangan],
    [2], [Contoh lain], [Keterangan],
  )
]
```

### Informasi Terstruktur (Key-Value)

Digunakan untuk identitas penyusun, data proyek, dll.:

```typst
#glide-field("Nama", "Luiz Garvincent")
#glide-field("NIS", "24161009")
#glide-field("Kelas", "XI RPL")
#glide-field("Pembimbing", "Bapak Miftahul Ilmi, S.Pd.")
```

### Kutipan / Sitasi

```typst
// Sitasi di akhir kalimat
Pembangunan berbasis komponen sangat dianjurkan @laravel_docs.

// Sitasi dengan menyebut nama penulis
Menurut @jones_2022, pendekatan ini terbukti efektif dalam pengembangan modern.
```

### Blok Kode (Code Block)

```typst
#raw(lang: "php", block: true,
"<?php
  echo 'Hello, World!';
?>")

#raw(lang: "bash", block: true,
"php artisan migrate --seed")

#raw(lang: "html", block: true,
"<div class=\"container\">
  <h1>Judul</h1>
</div>")
```

### Spasi Manual

```typst
#v(1em)    // Spasi vertikal (gunakan untuk jarak antar blok)
#v(2em)    // Spasi vertikal lebih besar
\          // Line break dalam heading atau grid cell
```

---

## 📚 Format `bibliography.yaml`

Format Hayagriva YAML yang digunakan Typst. Setiap entri terdiri dari `type`, `author`, `date`, dan `title`:

```yaml
# Format: kunci_unik: {type, author, date, title}
# Kunci harus unik dan cocok dengan @kunci_unik di file .typ

# Artikel / Jurnal / Sumber Web
jones_2022:
  type: article
  author: "Jones, Alice"
  date: "2022"
  title: "Modern Web Development Practices"

# Buku
pressman_2015:
  type: book
  author: "Pressman, Roger S."
  date: "2015"
  title: "Software Engineering: A Practitioner's Approach"

# Situs Web / Dokumentasi Online
laravel_docs:
  type: web
  author: "Otwell, Taylor"
  date: "2024"
  title: "Laravel Documentation"

# Sumber dari Organisasi / Lembaga (tanpa penulis individu)
mdn_html:
  type: web
  author: "Mozilla Developer Network"
  date: "2023"
  title: "HTML: HyperText Markup Language"

# Penulis Lebih dari Satu
ttofi_2011:
  type: article
  author: ["Ttofi, M. M.", "Farrington, D. P."]
  date: "2011"
  title: "Effectiveness of school-based programs to reduce bullying"
```

**Nilai `type` yang umum digunakan:**

| Type | Digunakan Untuk |
|------|-----------------|
| `article` | Jurnal, artikel web, berita, laporan online |
| `book` | Buku teks, monografi |
| `web` | Dokumentasi resmi, halaman website |
| `thesis` | Skripsi, tesis, disertasi |
| `proceedings` | Paper konferensi / prosiding |

**Catatan:** Field `author` bisa berupa string tunggal atau array YAML untuk penulis lebih dari satu:
```yaml
# Satu penulis
author: "Nama Belakang, Nama Depan"

# Lebih dari satu penulis
author: ["Nama Belakang1, Nama Depan1", "Nama Belakang2, Nama Depan2"]
```

---

## ✅ Checklist Sebelum Build PDF

- [ ] `config.yaml` terisi lengkap (judul, penulis, margin, font)
- [ ] `cover.typ` memiliki `layout: "cover"` di frontmatter
- [ ] Semua halaman awal (`00x-...`) memiliki `layout: "front"`
- [ ] Setiap bab utama dimulai dengan `#glide-bab(toc: [...])[[...]`
- [ ] Heading sub-bab menggunakan format `== X.Y Judul`
- [ ] Semua gambar konten menggunakan `#glide-figure()`, bukan `#image()` langsung
- [ ] Semua sitasi menggunakan `@kunci` yang ada di `bibliography.yaml`
- [ ] File `11-daftar-pustaka.typ` memanggil `#glide-bib("bibliography.yaml")`
- [ ] Bahasa Indonesia baku, istilah asing dicetak *miring*
- [ ] Tidak ada konten placeholder yang belum diisi
- [ ] Jalankan `python3 gld.py health .` dan pastikan tidak ada error
