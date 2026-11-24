# Hasil verifikasi — 24 November 2026

Implementasi menggunakan permintaan pemilik untuk tidak memakai Supabase. Cloudflare D1/R2/Images menggantikan database dan Storage; autentikasi admin diperiksa pada server melalui allowlist D1 dan sesi cookie.

| Pemeriksaan                             | Hasil aktual                                                            |
| --------------------------------------- | ----------------------------------------------------------------------- |
| ESLint                                  | Lulus, tanpa error/peringatan                                           |
| Next route type generation + TypeScript | Lulus                                                                   |
| Vitest                                  | 18 test lulus                                                           |
| Playwright end-to-end                   | 3 test lulus pada D1/R2/Images lokal                                    |
| Next.js production build                | Lulus, Next.js 16.4.6 / Node.js 24.19.0                                 |
| OpenNext Workers build                  | Lulus, adapter 1.20.17 / Wrangler 4.167.0                               |
| Audit dependency                        | 0 kerentanan; glob/minimatch di-override ke rilis yang sudah diperbaiki |
| Runtime preview Workers                 | HTTP 200                                                                |
| Migrasi D1 produksi                     | 0001 dan 0002 diterapkan pada akun tujuan                               |
| R2                                      | Bucket `tempe-segar-media` dibuat setelah diaktifkan pemilik            |
| Database produksi                       | 1 admin aktif, 0 produk; identitas login tidak disimpan di repository   |

E2E mencakup login lokal, penolakan seluruh mutasi admin tanpa sesi, upload gambar dengan decode/encode, penolakan SVG, tambah/edit/arsip/hapus produk, kategori dan relasi `ON DELETE SET NULL`, singleton unggulan, pengaturan dan validasi LINE, koreksi manual terkunci, perubahan sumber menjadi Perlu Ditinjau, konflik revisi, perubahan harga 409, pesan Korea, dan pengamanan media draft.

Uji demo terpisah memeriksa lebar 320, 375, 768, 1024, 1440 px; kolom 1/2/3/4/4; tanpa overflow; focus trap dan Escape; jumlah tetap ketika berpindah dari detail ke pemilih kanal; navigasi bahasa; pencarian Korea dan query yang bertahan setelah refresh. Script: `node scripts/verify-demo.mjs`, dijalankan dengan `npm run dev:demo`. Screenshot di `docs/previews/demo-*` selalu berlabel demo.

Uji concurrency SQL memeriksa hasil terjemahan revisi A yang selesai setelah B, koreksi manual terkunci yang dibuat ketika request mesin berjalan, serta persetujuan manual baru yang tidak boleh ditimpa penandaan Perlu Ditinjau dari snapshot lama. Pengujian database memakai SQLite dengan SQL migrasi yang sama, dilengkapi E2E memakai binding D1 sebenarnya dalam runtime lokal.

## Dependensi eksternal dan batas verifikasi

- **Akun admin produksi telah diprovisikan sesuai instruksi pemilik.** Tidak ada akun bootstrap publik atau password default; identitas dan credential tidak dicantumkan dalam repository.
- Foto dan harga aktual belum diberikan. Produksi mulai dari etalase kosong; fixture tidak dimasukkan ke D1 produksi.
- Kredensial Google Cloud belum diberikan. Alur penyimpanan, status gagal yang jujur, retry, fallback, manual override dan revisi sudah diuji; penerjemahan mesin terhadap Google live belum diuji.
- ID/tautan LINE belum diisi di produksi; kanal nonaktif. Format tautan OA/shared link diuji tanpa mengirim pesan.
- Nomor WhatsApp mengikuti spesifikasi pemilik. Status akun dan pengiriman pesan nyata harus diperiksa pemilik di aplikasi chat.
- Upload diuji terhadap binding Images/R2 lokal, bukan akun admin produksi, karena pemilik meminta akun produksi belum dibuat.
- Tidak ada klaim Lighthouse/LCP/CLS sebelum pengukuran terkontrol. Tidak ada omzet, ulasan atau jumlah transaksi buatan.
- OpenNext memberi peringatan dukungan Windows dan Node.js proxy. Bundle berhasil dibangun di Windows dan diverifikasi pada Workers; CI disediakan pada Linux. Versi dipin untuk reproduksibilitas.
- Deployment pertama gagal saat upload aset karena koneksi; retry berikutnya berhasil. Ini bukan kegagalan penyimpanan database.

URL publik: **https://tempe-segar.ricky99n.workers.dev**. Pemeriksaan produksi tambahan dapat dijalankan dengan `node scripts/verify-production.mjs` (read-only; tidak membuat akun atau produk).

Pemeriksaan browser produksi lulus: SSR lang, canonical URL, pergantian bahasa, lima lebar layar, dan proteksi admin; tanpa error browser dan tanpa mode demo. Versi Worker terverifikasi: 1b52078a-8547-4782-a7d0-00432d0c7e4b. Screenshot produksi tersimpan di docs/previews/production-1440.png dan production-375.png.

Pembaruan login: akun admin telah diaktifkan melalui provisioning privat. Login, API sesi, dan halaman dashboard produksi merespons HTTP 200; dashboard serta daftar produk diverifikasi melalui browser dengan sesi autentik. Sesi verifikasi ditutup sesudah pengujian. Identitas dan password tidak dicantumkan pada source atau log.

Regresi adapter 1.20.18 berhasil direproduksi pada preview Workers ketika request membawa cookie (HTTP 500). Pin adapter 1.20.17 mengembalikan respons normal; probe scripts/check-worker-cookies.mjs memeriksa tiga rute publik dengan cookie, penolakan sesi palsu, dan redirect admin. Probe yang sama ditambahkan ke CI.
