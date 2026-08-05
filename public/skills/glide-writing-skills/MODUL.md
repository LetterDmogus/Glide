# Struktur Modul Pembelajaran

Referensi struktur dan template per bab untuk modul pembelajaran, modul praktikum, atau modul tutorial bidang teknologi dan rekayasa perangkat lunak.

---

## Struktur Bab

| Bab | Judul | Isi Utama |
|-----|-------|-----------|
| BAB I | PENDAHULUAN | Deskripsi Singkat, Prasyarat, Petunjuk Penggunaan, Kompetensi Akhir |
| BAB II–IX | MATERI UTAMA | Pengantar teori, langkah praktis, contoh kode, latihan, milestone |
| PENUTUP | PENUTUP | Kesimpulan per kompetensi, saran pengembangan |
| DAFTAR PUSTAKA | — | Dihasilkan otomatis dari `bibliography.yaml` |

---

## Penamaan File Section

```
sections/
├── 00a-kata-pengantar.typ
├── 00b-daftar-isi.typ
├── 00c-daftar-gambar.typ
├── 01-pendahuluan.typ
├── 02-bab-materi-1.typ
├── 03-bab-materi-2.typ
├── 10-penutup.typ
└── 11-daftar-pustaka.typ
```

---

## Template Per Bab

### BAB I — Pendahuluan (`01-pendahuluan.typ`)

```typst
#glide-bab(toc: [BAB I - PENDAHULUAN])[BAB I \\ PENDAHULUAN]

== 1.1 Deskripsi Singkat

Modul ini membahas tentang [topik utama modul]. Peserta akan mempelajari
[ringkasan isi: konsep, alat, dan praktik yang dibahas].

== 1.2 Prasyarat Pembelajaran

Sebelum mempelajari modul ini, peserta diharapkan telah memahami:

- [Prasyarat 1, misal: dasar-dasar HTML dan CSS]
- [Prasyarat 2, misal: penggunaan terminal/command line]

== 1.3 Petunjuk Penggunaan

+ Baca setiap materi secara berurutan dari Bab I hingga Bab terakhir.
+ Ikuti setiap langkah praktik dan pastikan hasil sesuai sebelum melanjutkan.
+ Apabila menemui kendala, ulangi langkah dari awal sub-bab tersebut.
+ Kerjakan latihan di akhir setiap bab untuk mengukur pemahaman.

== 1.4 Kompetensi Akhir

Setelah menyelesaikan modul ini, peserta diharapkan mampu:

+ [Kompetensi 1: kata kerja operasional + objek, misal: "membuat halaman web statis menggunakan HTML5"]
+ [Kompetensi 2]
+ [Kompetensi 3]
```

---

### BAB Materi (`02-bab-materi-1.typ`, dst.)

```typst
#glide-bab(toc: [BAB II - JUDUL MATERI])[BAB II \\ JUDUL MATERI]

== 2.1 Pengantar

[Paragraf pembuka yang menjelaskan gambaran umum materi bab ini dan
kaitannya dengan kompetensi akhir yang ditargetkan.]

== 2.2 Teori Dasar

[Penjelasan konsep teoretis yang perlu dipahami sebelum praktik.
Gunakan sitasi jika mengacu pada sumber eksternal.]

Menurut @nama_referensi, [kutipan atau parafrase teori].

#glide-figure("images/diagram-konsep.png", "Diagram Konsep [Nama Topik]")

== 2.3 Langkah Praktik

Berikut adalah langkah-langkah untuk [tujuan praktik]:

+ *Langkah 1: [Judul langkah]*

  [Penjelasan langkah. Gunakan kalimat imperatif yang jelas.]

  #raw(lang: "bash", block: true,
  "perintah-terminal-yang-dijalankan")

+ *Langkah 2: [Judul langkah]*

  [Penjelasan.]

  #raw(lang: "python", block: true,
  "# Kode yang digunakan
  contoh_kode = True")

  #glide-figure("images/hasil-langkah-2.png", "Hasil Langkah 2: [Deskripsi]")

== 2.4 Latihan

Kerjakan latihan berikut untuk mengukur pemahaman pada bab ini:

+ [Instruksi latihan 1]
+ [Instruksi latihan 2]

#v(1em)

> *Milestone:* Pastikan [hasil yang bisa diverifikasi] sebelum melanjutkan ke bab berikutnya.
```

---

### Penutup (`10-penutup.typ`)

```typst
#glide-bab(toc: [PENUTUP])[PENUTUP]

== Kesimpulan

Setelah menyelesaikan modul ini, peserta telah mencapai kompetensi berikut:

+ [Kompetensi 1 dari Bab I — dinyatakan dalam bentuk pencapaian konkret]
+ [Kompetensi 2]
+ [Kompetensi 3]

== Saran

Untuk terus mengembangkan kemampuan, penulis menyarankan peserta untuk:

+ Mempelajari [topik lanjutan yang relevan].
+ Mengerjakan proyek mandiri menggunakan teknologi yang telah dipelajari.
+ Mengacu pada dokumentasi resmi [nama teknologi] untuk fitur-fitur terbaru.
```

---

## Checklist Khusus Modul

- [ ] Kompetensi akhir di Bab I ditulis dengan kata kerja operasional yang terukur
- [ ] Setiap bab materi memiliki bagian teori, langkah praktik, dan latihan
- [ ] Setiap langkah praktik memiliki kode atau gambar pendukung
- [ ] Milestone di akhir setiap bab dapat diverifikasi hasilnya
- [ ] Kesimpulan di Penutup menjawab setiap kompetensi di Bab I
- [ ] Tidak ada langkah yang loncat tanpa penjelasan transisi
