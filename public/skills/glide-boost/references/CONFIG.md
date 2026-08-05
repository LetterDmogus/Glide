# ⚙️ Konfigurasi Proyek (Config Reference)

GLIDE menggunakan file `config.yaml` untuk pengaturan global dan blok *frontmatter* di setiap file Markdown untuk pengaturan spesifik halaman.

## 1. Pengaturan Global (`config.yaml`)

File ini berada di root folder proyek Anda.

### Informasi Dasar
- **`title`**: Judul laporan (muncul di metadata PDF).
- **`author`**: Nama penulis.
- **`subject`**: Subjek/Topik laporan.
- **`keywords`**: Kata kunci dokumen (dipisahkan koma).

### Tata Letak (Layout)
- **`margin_top`**, **`margin_bottom`**, **`margin_right`**: Default `3cm`.
- **`margin_left`**: Default `4cm` (Standar penjilidan Indonesia).
- **`line_spacing`**: Spasi antar baris (contoh: `1.5`).
- **`font_size`**: Ukuran huruf isi (contoh: `12pt`).
- **`font_family`**: Font utama (contoh: `'Times New Roman', serif`).
- **`text_align`**: Perataan teks (`justify`, `left`, `center`, `right`).

### Fitur Akademik & PDF
- **`citation_style`**: Gaya kutipan (`apa` atau `ieee`).
- **`appendix_label`**: Label untuk lampiran (default: `"Lampiran"`). Digunakan di `[[LOA]]`.
- **`page_number_style`**: Gaya angka (`decimal`, `lower-roman`, `upper-roman`).
- **`show_total_pages`**: Jika `true`, format halaman menjadi "X / Y".
- **`watermark`**: Teks bebas (misal: `"DRAFT"`) atau `"logo:images/logo.png"`.

---

## 2. Pengaturan Per-File (Frontmatter)

Anda bisa menimpa pengaturan global di bagian atas file `.md`.

```markdown
---
title: "Bab Khusus"
layout: "main"               # cover, front, main
margin_left: "3cm"           # Gunakan margin beda untuk file ini
page_pattern: "center"       # none, center, formal
---
```

### Opsi `page_pattern`:
- **`none`**: Sembunyikan nomor halaman.
- **`center`**: Nomor selalu di bawah-tengah.
- **`formal`**: Halaman pertama bab di bawah-tengah, sisanya di kanan-atas.
