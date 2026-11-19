# NARA — Naungan Aspirasi Dan Rasa Apresiasi Siswa

NARA adalah web aspirasi untuk siswa SMA Tunas Bangsa. Frontend dibuat dengan HTML, CSS, dan JavaScript tanpa proses build. Supabase menyediakan database dan login pengurus OSIS; GitHub Pages dapat menghosting file frontend.

## Menjalankan lokal

1. Buka folder proyek ini di VS Code.
2. Pasang ekstensi **Live Server** jika belum ada.
3. Klik kanan `index.html`, lalu pilih **Open with Live Server**.

Tanpa konfigurasi Supabase, aplikasi berjalan dalam mode demo: kiriman hanya tersimpan di browser/perangkat ini dan belum diterima OSIS. Login OSIS demo tidak aman untuk penggunaan sungguhan.

## Menghubungkan Supabase

1. Buat proyek di [Supabase](https://supabase.com/).
2. Buka **SQL Editor**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql), lalu jalankan.
3. Dari **Project Settings → API Keys**, salin Project URL dan **publishable key** (atau legacy `anon` key). Jangan pernah meletakkan `secret` atau `service_role` key di frontend.
4. Buka **Authentication → Users** dan buat akun untuk pengurus OSIS.
5. Salin UUID akun OSIS, lalu jalankan perintah berikut di SQL Editor dengan UUID tersebut:

   ```sql
   insert into public.osis_admins (user_id)
   values ('UUID-AKUN-OSIS');
   ```

6. Isi `supabaseUrl` dan `supabasePublishableKey` pada [`config.js`](config.js). Contoh:

   ```js
   window.NARA_CONFIG = {
     supabaseUrl: "https://PROJECT-REF.supabase.co",
     supabasePublishableKey: "sb_publishable_...",
     appName: "NARA"
   };
   ```

Publishable key memang terlihat di browser. Keamanan akses data bergantung pada Row Level Security (RLS) di skema: publik hanya dapat membaca aspirasi publik, sedangkan aspirasi privat dan perubahan status hanya dapat diakses akun yang terdaftar sebagai pengurus OSIS. Jangan menonaktifkan RLS.

## Hosting di GitHub Pages

1. Buat repository baru di GitHub, lalu unggah/push semua file proyek ini ke branch `main` (termasuk folder `supabase`).
2. Di repository, buka **Settings → Pages**.
3. Pada **Build and deployment**, pilih **Deploy from a branch**, pilih `main` dan folder `/(root)`, lalu tekan **Save**.
4. Tunggu URL situs tampil di halaman Pages. URL project biasanya berbentuk `https://USERNAME.github.io/NAMA-REPOSITORY/`.
5. Buka URL tersebut dan uji kiriman publik, kiriman privat, login OSIS, serta perubahan status.

GitHub Pages hanya menghosting file statis; database tetap berada di Supabase. Konfigurasi pada `config.js` ikut dipublikasikan bersama halaman—hanya isi dengan Project URL dan publishable key, bukan secret. Jika repository public, nilai tersebut juga akan terlihat di source code repository.

Sebelum URL dibagikan ke siswa, sepakati dengan pihak sekolah siapa yang menangani aspirasi privat, masa penyimpanan/penghapusan data, dan prosedur untuk isi yang membutuhkan tindak lanjut. Skema saat ini tidak membatasi spam; evaluasi mekanisme pencegahan penyalahgunaan sebelum dibuka untuk umum.

## Berkas proyek

- `index.html` — struktur halaman dan formulir.
- `styles.css` — tampilan responsif.
- `app.js` — interaksi, mode demo, dan komunikasi Supabase.
- `config.js` — Project URL dan publishable key.
- `supabase/schema.sql` — tabel dan kebijakan keamanan RLS.
- `API.md` — struktur data dan perilaku akses database.
