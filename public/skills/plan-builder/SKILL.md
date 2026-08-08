---
name: plan-builder
description: Panduan membuat dan memperbarui berkas rencana penulisan dokumen (PLAN.md) di proyek Glide 2.0.
---

# Plan Builder Skill (Glide 2.0)

Gunakan skill ini ketika pengguna meminta Anda untuk membuat kerangka dokumen, rencana penulisan bab, daftar tugas (tasklist), atau catatan referensi proyek.

## Struktur Standar `PLAN.md`

Setiap proyek Glide 2.0 dapat memiliki berkas `PLAN.md` di root folder proyek dengan format berikut:

```markdown
# 📋 Rencana & Kerangka Dokumen: [Judul Dokumen]

> [!NOTE]
> Catatan utama tentang target penyelesaian atau panduan gaya penulisan dokumen ini.

## 🎯 Ringkasan & Target
- [x] Membuat struktur proyek dan konfigurasi `config.yaml`
- [ ] Menyelesaikan Bab 1: Pendahuluan
- [ ] Menyelesaikan Bab 2: Tinjauan Pustaka
- [ ] Menambahkan sitasi & Daftar Pustaka

## 📚 Peta Bab & Referensi Berkas

### 1. Bab I - Pendahuluan
- **Berkas**: [[sections/01-pendahuluan.typ]]
- **Poin Utama**:
  - Latar belakang masalah penulisan
  - Rumusan masalah dan tujuan
- **Referensi Sitasi**: `@fajar2026`

### 2. Bab II - Tinjauan Pustaka
- **Berkas**: [[sections/02-tinjauan-pustaka.typ]]
- **Poin Utama**:
  - Teori pendukung
  - Landasan penelitian sebelumnya
- **Referensi Sitasi**: `@glide2026`

---

## 📊 Tabel Jadwal & Milestones

| Bab | Target Selesai | Status | Penanggung Jawab |
| --- | --- | --- | --- |
| Bab 1 Pendahuluan | 2026-08-10 | ⏳ In Progress | Writer |
| Bab 2 Pustaka | 2026-08-15 | 📑 Draft | Writer |
| Bab 3 Metodologi | 2026-08-20 | 📑 Draft | Writer |
```

## Aturan Penulisan `PLAN.md`
1. Gunakan tautan `[[relative/path.typ]]` untuk menghubungkan catatan dengan berkas bab Typst yang relevan di Glide.
2. Gunakan checkbox `- [ ]` untuk item yang belum selesai dan `- [x]` untuk item yang sudah selesai.
3. Selalu perbarui `PLAN.md` ketika ada perubahan pada bab atau penambahan referensi sitasi baru.
