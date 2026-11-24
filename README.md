# Tempe Segar

Katalog tempe tiga bahasa dengan pengelolaan produk dan pemesanan melalui WhatsApp/LINE. Dibangun dengan Next.js App Router, TypeScript, Tailwind, Cloudflare Workers, D1, R2, dan Images. **Tidak memerlukan Supabase.**

Website: **https://tempe-segar.ricky99n.workers.dev** · [Login admin](https://tempe-segar.ricky99n.workers.dev/admin/login)

## Keputusan implementasi

- Permintaan pemilik untuk tidak memakai Supabase mengubah database menjadi D1, penyimpanan gambar menjadi R2, serta autentikasi menjadi allowlist admin dengan password hash dan sesi cookie server.
- D1 tidak memiliki RLS PostgreSQL. Database hanya tersedia melalui binding Worker; tidak ada credential atau endpoint SQL publik. Setiap mutasi memeriksa sesi dan admin aktif, sedangkan serializer publik membatasi data produk terbit. Relasi gambar memeriksa publikasi parent.
- `/`, `/ko`, `/en` memakai satu komponen katalog; Indonesia selalu default. Detail menggunakan dialog/bottom sheet, bukan halaman produk.
- Seluruh harga KRW; promo berlaku pada interval mulai inklusif, selesai eksklusif. Jadwal admin ditampilkan dalam Asia/Seoul dan disimpan UTC.
- Google Cloud Translation Advanced v3 dipanggil melalui REST adapter server dengan service-account JWT, agar sesuai Workers. Teks sumber disimpan lebih dahulu; kedua target ditunggu, dibatasi timeout, dan hasil lama tidak dapat menimpa revisi baru. Kredensial belum diisi bukan keberhasilan terjemahan.
- Tidak ada produk demo atau akun admin otomatis di produksi. Sesuai permintaan pemilik, **email dan akun admin produksi dibiarkan kosong**. Data produk asli, harga, foto, konfigurasi LINE, dan kredensial Google harus diisi pemilik.
- Logo bawaan adalah wordmark sederhana, bukan logo resmi. Ilustrasi SVG di mode demo bukan foto produk aktual.

## Menjalankan lokal

Gunakan **Node.js 24 LTS** dan npm. Versi dependency dipin dalam `package.json` dan `package-lock.json`.

```sh
npm ci
cp .env.example .env.local
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

`next dev` menginisialisasi binding lokal D1/R2/Images melalui OpenNext. Data berada di `.wrangler/state`, terpisah dari produksi. Buka URL lokal yang dicetak terminal. Runtime server memerlukan binding Cloudflare; `next start` saja tidak menyediakan D1/R2.

Untuk melihat empat produk contoh tanpa memasukkannya ke database:

```sh
npm run dev:demo -- --port 3001
```

Mode demo hanya berjalan pada hostname `localhost` / `127.0.0.1`, selalu memasang label demo dan menonaktifkan order. Fixture berada di `lib/demo.ts`; tidak ada seed demo otomatis pada migrasi produksi.

## Database dan gambar

Migrasi SQL bernomor berada di `migrations/` dan dikelola Wrangler. `npm run db:local` atau `npm run db:remote` hanya menerapkan migrasi yang belum dijalankan. Jangan mengedit migrasi yang sudah diterapkan.

Binding pada `wrangler.jsonc`:

| Binding                 | Fungsi                                           |
| ----------------------- | ------------------------------------------------ |
| `DB`                    | D1 `tempe-segar-db`                              |
| `MEDIA`                 | R2 `tempe-segar-media`                           |
| `IMAGES`                | Cloudflare Images, decode dan normalisasi upload |
| `WORKER_SELF_REFERENCE` | Binding aplikasi OpenNext                        |

R2 harus diaktifkan pada akun Cloudflare. Images melakukan transformasi ketika admin mengunggah, bukan setiap kunjungan katalog. Periksa kuota dan ketentuan layanan pada akun Anda.

Upload menerima JPEG/PNG/WebP maksimal 5 MB dan 25 megapiksel. Server memeriksa signature, membaca dimensi, decode, dan encode ulang WebP maksimal 1200 px; SVG ditolak. Nama objek berupa UUID. Gambar disimpan dengan referensi relasional D1; menghapus gambar yang masih dipakai ditolak. Upload yang gagal menyimpan metadata menghapus objek penggantinya. Pengaturan admin menyediakan pembersihan upload tak terpakai yang berumur lebih dari 24 jam. Jika penghapusan objek R2 gagal sesudah metadata dihapus, pemilik dapat memeriksa objek `catalog/` tanpa record D1 di dashboard R2.

## Membuat admin pertama, nanti saat siap

Tidak ada pendaftaran publik, password bawaan, atau akun yang dapat diklaim pengunjung pertama. Pemilik memilih email dan menjalankan:

```sh
npm run admin:create -- --email email-pemilik@example.com --remote
```

Script meminta password minimal 16 karakter melalui input tersembunyi. Password tidak dikirim melalui argumen CLI atau ditulis ke file. Hanya salt acak dan hash PBKDF2-SHA256 100.000 iterasi yang disimpan di D1, mengikuti batas Web Crypto Workers. Gunakan password panjang yang unik. Untuk lokal, ganti `--remote` dengan `--local`.

Sesi acak berlaku 8 jam, disimpan sebagai hash di D1, dengan cookie HttpOnly, SameSite Strict, dan Secure di HTTPS. Semua endpoint memeriksa admin aktif pada setiap request. Menonaktifkan `admin_users.is_active` melalui dashboard/CLI segera memblokir sesi. Tidak ada reset password publik; perubahan credential dilakukan pemilik melalui proses server yang terkontrol.

## Mengisi toko

1. Masuk di `/admin/login` setelah admin dibuat.
2. Tambahkan kategori dengan nama Indonesia, slug unik, dan urutan.
3. Tambahkan produk: nama, SKU unik, slug stabil, deskripsi, satuan, harga Won, ketersediaan, dan gambar asli. Isi alt text. Tombol kiri/kanan, Utama, atau drag mengatur urutan galeri, maksimal delapan gambar.
4. Simpan sebagai Draft; pilih Terbit setelah data siap. Terbit membutuhkan foto dan harga valid. Arsip menghilangkan produk dari publik. Hapus permanen meminta nama produk.
5. Koreksi Korea/English pada panel terjemahan. Simpan sumber Indonesia dahulu; panel koreksi mengacu pada revisi sumber terakhir tersimpan. Kunci koreksi manual untuk mencegah penimpaan. Sumber berubah menandai koreksi lama Perlu Ditinjau; publik memakai Indonesia sampai hasil disetujui.
6. Pilih satu produk pada Spot Unggulan. Produk yang tidak terbit/habis atau jadwal kedaluwarsa menyembunyikan slot. Label Terlaris adalah keputusan editorial admin.
7. Atur nomor dan kanal di Pengaturan. Nomor WhatsApp awal `821065653524`. Pemilik perlu menguji akun WhatsApp aktual.

## LINE dan order

LINE awal nonaktif. Isi ID Official Account asli (termasuk `@` bila digunakan) atau tautan HTTPS toko dari `line.me` / `lin.ee`, pilih mode dan aktifkan. Format OA: `https://line.me/R/oaMessage/{encodedId}/?{encodedMessage}`. Mode tautan bersama tidak menambahkan pesan ke URL; pengunjung menyalin pesan untuk ditempel.

`POST /api/order-link` memeriksa produk terbaru, status terbit, ketersediaan, jumlah 1–99, harga terkini, dan kanal. Harga berbeda mengembalikan 409 dan meminta tinjauan ulang. Website hanya membentuk tautan dan draf pesan; tidak mengirim pesan, membuat bukti transaksi, mengurangi stok, atau menghitung omzet.

## Auto-translate Google Cloud

1. Aktifkan Cloud Translation API pada project Google Cloud pemilik, atur billing/kuota/budget sesuai kebutuhan.
2. Berikan service account hak minimum `roles/cloudtranslate.user`. Jangan commit credential.
3. Set secret Worker melalui input tersembunyi/stdin Wrangler:

```sh
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
npx wrangler secret put GOOGLE_CLOUD_PROJECT
```

Masukkan JSON service account dan ID project masing-masing, melalui terminal Anda. Lokal memakai `.dev.vars` yang diabaikan Git. Tidak ada secret dengan prefix `NEXT_PUBLIC_`.

Tanpa konfigurasi, teks Indonesia tetap tersimpan, status target menjadi Gagal dengan pesan konfigurasi, dan katalog memakai fallback Indonesia beratribut `lang="id"`. Pindah bahasa tidak memanggil provider. Harga dan perubahan gambar tanpa teks alt tidak memicu terjemahan. Endpoint dibatasi 10 permintaan terjemahan/menit/admin melalui D1; request aktif dideduplikasi dengan hash sumber. Timeout provider 8 detik per panggilan, satu retry hanya untuk error sementara. Target manual terkunci tidak ditimpa.

## Pemeriksaan

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run cf:build
npm audit
```

Unit/integration test memeriksa harga, batas waktu, URL encoding, fallback, validasi, constraint SQLite yang sama dengan D1, konflik edit, serta concurrency terjemahan. E2E memakai binding lokal D1/R2/Images dan akun **uji lokal saja**. Contoh PowerShell:

```powershell
$env:E2E_PASSWORD = '<password-acak-khusus-uji-lokal-minimal-16-karakter>'
node scripts/prepare-e2e.mjs
npx playwright install chromium
npm run test:e2e
Remove-Item Env:E2E_PASSWORD
```

`scripts/prepare-e2e.mjs` tidak mempunyai mode remote. Jangan gunakan password admin nyata untuk pengujian. E2E memeriksa bahasa, lebar layar, proteksi admin, login, upload, tambah/edit/arsip, status terjemahan tanpa provider, revision guard, serta tautan order tanpa mengirim pesan sungguhan. Hasil pengujian aktual dicatat di `docs/verification.md`.

## Deploy Cloudflare

Konfigurasi akun tujuan ada di `wrangler.jsonc`. Source berada di [GitHub](https://github.com/ricky99n-oss/tempesegar). Build mengikuti [OpenNext Cloudflare](https://opennext.js.org/cloudflare/get-started), dengan `nodejs_compat` dan Next.js stabil. Images mengikuti [dokumentasi binding resmi](https://developers.cloudflare.com/images/optimization/binding/).

```sh
npx wrangler login
npm ci
npm run db:remote
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Untuk akun baru, buat D1 dan R2 dahulu, lalu ganti ID/bucket pada konfigurasi. `NEXT_PUBLIC_SITE_URL` harus sama dengan URL deployment/domain; nilai ini diperlukan pada **waktu build** untuk canonical, hreflang, sitemap, dan Open Graph. Export variabel ini sebelum `cf:build`; sesuaikan pula `vars` pada Wrangler.

Deployment bersifat aplikasi server, bukan static export. Linux direkomendasikan OpenNext untuk build; Windows perlu verifikasi bundle Workers selain build Next.js. Workflow `.github/workflows/ci.yml` menjalankan pemeriksaan dan build di Linux. Deployment ulang dilakukan dengan perintah Wrangler setelah pemeriksaan lulus; push GitHub saja tidak otomatis menerbitkan versi.

Tidak ada pengaturan custom domain atau layanan Google berbayar otomatis. Domain, konten asli, akun admin, dan konfigurasi Google/LINE tetap keputusan pemilik.
