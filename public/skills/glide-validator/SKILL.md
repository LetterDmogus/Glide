---
name: glide-validator
description: AI Quality & Structure Validator for Glide. Menjalankan linter dan validator proyek Glide secara langsung menggunakan script validator bersama, mendeteksi file nyasar, urutan bab, validitas config, sitasi rusak, missing image assets, gambar tidak terpakai, sitasi tidak terpakai, serta pelanggaran gaya penulisan akademik (bold, spasi, tanda baca, blacklist kata).
---

# Glide Validator — AI Structure & Quality Inspector

Skill ini memungkinkan AI menjalankan validator & linter struktur proyek Glide secara langsung menggunakan **engine validator yang sama** yang dipakai oleh aplikasi.

---

## 🚀 Cara AI Menjalankan Validasi Proyek

Ketika pengguna meminta untuk:
- *"Validasi struktur proyek ini"*
- *"Jalankan validator/linter"*
- *"Cek apakah ada file yang salah tempat atau rusak"*

AI dapat langsung **menjalankan script validator bawaan**:

```bash
# Jalankan script validator (output teks terminal)
node .agents/skills/glide-validator/scripts/validator.js

# Atau jalankan dengan flag --json untuk parsing hasil secara terstruktur
node .agents/skills/glide-validator/scripts/validator.js --json
```
---

## 🔍 Apa yang Diperiksa oleh Script:
1. **Config**: `config.yaml` atau `glide.yaml` di root proyek.
2. **Sections**: Folder `sections/`, file gambar yang tersasar, file dokumen non-Typst, file kosong (0 bytes), serta urutan nomor bab (`01_...`, `02_...`).
3. **Cover**: Ketersediaan `cover.typ`.
4. **Sitasi**: Sitasi `@key` dicocokkan ke `bibliography.yaml` — termasuk deteksi **sitasi tidak terpakai** (entri yang ada di YAML tapi tidak pernah dikutip).
5. **Gambar**: Referensi `#image(...)` dan `#glide-figure(...)` dipastikan ada di disk — termasuk deteksi **gambar tidak terpakai** (file di `images/` yang tidak pernah dirujuk di naskah).
6. **Penulisan akademik** (per file `.typ`, kecuali file yang di-exclude):
   - Penggunaan `*bold*` di paragraf (seharusnya `_italic_`)
   - Spasi ganda antar kata
   - Spasi sebelum tanda baca (` ,` ` .`)
   - Kalimat diawali angka digit
   - `#image()` tanpa parameter `caption:`
   - **Blacklist kata/frasa/pola** dari `config.yaml`

---

## ⚙️ Konfigurasi Linter di `config.yaml`

Validator membaca dua opsi dari section `linter:` di `config.yaml`:

### Exclude — skip file dari writing checks
```yaml
linter:
  exclude:
    - cover.typ              # skip berdasarkan nama file
    - sections/lampiran.typ  # skip berdasarkan path relatif
```

### Blacklist — kata/frasa/pola terlarang
```yaml
linter:
  blacklist:
    - pattern: '\bdll\b\.?'
      message: "Hindari singkatan 'dll.' dalam karya tulis formal."
      severity: warning        # atau: info
    - pattern: 'kata_terlarang'
      message: "Pesan custom."
      severity: info
```

> **Catatan:** Gunakan **single-quote** (`'`) untuk nilai `pattern` agar karakter regex seperti `\b` dan `\.` terbaca benar oleh YAML.

Jika pengguna meminta bantuan mengonfigurasi blacklist atau exclude, **edit langsung `config.yaml`** di root proyek — jangan buat file baru.

---

## 🛠️ Alur Tindakan AI Setelah Validasi:
1. Jalankan `node .agents/skills/glide-validator/scripts/validator.js --json`.
2. Ringkas hasil temuan kepada pengguna (Skor Kesehatan, Daftar Error & Peringatan).
3. Tawarkan perbaikan otomatis (*auto-fix*), seperti memindahkan gambar yang salah tempat ke `images/` atau menambahkan placeholder sitasi ke `bibliography.yaml`.

Jika pengguna meminta *"Tolong perbaiki"* atau menyetujui rekomendasi:
1. **Pindahkan file gambar yang salah tempat** dari `sections/` ke `images/`, lalu perbarui path `#image(...)` di file `.typ` terkait.
2. **Koreksi nama file bab** agar seragam (`01_slug.typ`, `02_slug.typ`).
3. **Tambahkan entri kosong/dummy pada `bibliography.yaml`** untuk sitasi yang belum terdaftar.
4. **Buat file laporan `validation-report.md`** di folder proyek agar pengguna bisa melihat riwayat ringkasan hasil validasi.

---
