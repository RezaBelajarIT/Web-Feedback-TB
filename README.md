# NARA

## Menjalankan

1. Pasang Node.js 18 atau lebih baru.
2. Salin `.env.example` menjadi `.env`, lalu isi `GEMINI_API_KEY` dengan API key dari Google AI Studio.
3. Jalankan:

```powershell
npm start
```

3. Buka `http://localhost:3000`.

API key hanya dibaca oleh server dan tidak ditampilkan di halaman web. Tanpa API key, panel chat akan memberi pesan bahwa konfigurasi belum tersedia.
