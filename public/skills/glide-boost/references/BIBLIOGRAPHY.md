# 📚 Referensi & Bibliografi (Citations Reference)

GLIDE mendukung manajemen sitasi otomatis menggunakan engine terintegrasi yang mendukung gaya APA dan IEEE.

## 1. File `bibliography.yaml`

Semua sumber pustaka harus didaftarkan di dalam file `bibliography.yaml` di root proyek.

### Format Entry:
```yaml
kunci_unik:
  author: "Nama Penulis"
  year: "2023"
  title: "Judul Buku/Artikel"
  text: "Nama Penulis. (2023). Judul. Kota: Penerbit." # Digunakan untuk style APA
```

## 2. Cara Melakukan Sitasi

Gunakan sintaks `[@kunci]` di dalam teks Markdown Anda.

- **Contoh**: `Penelitian ini mengikuti metode dari [@budi23].`
- **Output (APA)**: `Penelitian ini mengikuti metode dari (Budi, 2023).`
- **Output (IEEE)**: `Penelitian ini mengikuti metode dari [1].`

## 3. Menampilkan Daftar Pustaka

Gunakan tag `[[BIBLIOGRAPHY]]` di akhir dokumen (biasanya di file section terakhir).

Sistem akan otomatis:
1. Mengumpulkan semua kunci yang **benar-benar digunakan** di dalam teks.
2. Mengurutkan daftar berdasarkan abjad penulis.
3. Memformat tampilan sesuai `citation_style` di `config.yaml`.

## 4. Gaya Sitasi (`citation_style`)

- **`apa` (Default)**: Menggunakan format `(Penulis, Tahun)` di teks dan daftar alfabetis.
- **`ieee`**: Menggunakan format nomor kotak `[1]` di teks dan penomoran urut di daftar pustaka.
