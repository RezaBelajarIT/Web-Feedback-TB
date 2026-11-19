# Database NARA di Supabase

Frontend mengakses Supabase secara langsung menggunakan Supabase JavaScript client. Jalankan [`supabase/schema.sql`](supabase/schema.sql) di SQL Editor proyek Supabase sebelum mengisi konfigurasi di `config.js`.

## Tabel `public.aspirations`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | ID otomatis |
| `type` | `text` | `saran`, `kritik`, atau `apresiasi` |
| `category` | `text` | Topik aspirasi |
| `title` | `text` | Judul, maksimal 70 karakter |
| `message` | `text` | Isi, maksimal 500 karakter |
| `anonymous` | `boolean` | Apakah pengirim anonim |
| `name` | `text` | Nama panggilan opsional |
| `visibility` | `text` | `public` atau `private` |
| `status` | `text` | `new`, `in_review`, `in_progress`, atau `done` |
| `created_at` | `timestamptz` | Waktu pembuatan otomatis |

Saat dikirim dari browser, nama kolom mengikuti skema SQL (snake_case). Tampilan aplikasi mengubah `created_at` ke `createdAt` untuk pemformatan waktu.

## Akses dan keamanan

- Pengunjung dapat membuat aspirasi dengan status awal `new`.
- Pengunjung hanya dapat membaca aspirasi ber-`visibility = 'public'`.
- Akun Supabase yang tercantum pada `public.osis_admins` dapat membaca semua aspirasi dan mengubah status.
- Kebijakan RLS membatasi pembacaan data privat di database, bukan hanya menyembunyikannya pada tampilan.
- Browser memakai Project URL dan publishable key. Jangan pernah memakai atau memublikasikan `secret` maupun `service_role` key.

Untuk memberi akses dashboard kepada pengurus, buat akun di **Authentication → Users**, lalu daftarkan UUID-nya:

```sql
insert into public.osis_admins (user_id)
values ('UUID-AKUN-OSIS');
```

Hapus akses dengan menghapus baris akun terkait dari `public.osis_admins`. Jangan memberikan akses admin kepada akun bersama atau akun yang tidak lagi dikelola sekolah.
