# TEMPE SEGAR — MASTER SPECIFICATION

Panduan implementasi website katalog dan dashboard admin untuk Codex, Cursor, atau developer.

**Nama website:** Tempe Segar  
**Basis teknologi:** Node.js + Next.js + TypeScript + Supabase  
**Bahasa:** Indonesia sebagai default, Korea, dan English  
**Mata uang:** Korean Won / KRW / ₩  
**Kontak utama:** +821065653524  
**Tanggal spesifikasi:** 24 November 2026

---

## 1. Instruksi utama untuk coding agent

Bangun website **Tempe Segar** yang siap digunakan sebagai katalog produk tempe dengan tampilan marketplace modern. Pengunjung cukup membuka satu halaman katalog, melihat produk, memilih jumlah, lalu menentukan apakah ingin memesan lewat WhatsApp atau LINE. Admin mengelola konten dari dashboard yang dilindungi login.

Implementasikan aplikasi yang terhubung ke Supabase, bukan hanya mockup. Kerjakan bertahap sampai katalog, CRUD admin, penyimpanan gambar, terjemahan, dan tautan pemesanan berfungsi. Gunakan dokumen ini sebagai sumber kebutuhan utama.

Keputusan wajib:

- Website publik hanya memiliki **satu halaman katalog untuk setiap bahasa**. Pergantian bahasa menampilkan katalog yang sama dengan teks berbeda.
- Detail produk muncul melalui modal atau drawer di halaman katalog; jangan membuat halaman detail produk terpisah.
- Bahasa pertama untuk pengunjung baru adalah **Indonesia**, termasuk ketika browser menggunakan bahasa Korea atau Inggris.
- Seluruh harga tetap dalam **Won Korea**, tanpa konversi ke Rupiah atau mata uang lain.
- Klik tombol order membuka pilihan **WhatsApp atau LINE** terlebih dahulu.
- Ada **satu spot unggulan di depan katalog**, yang dapat diatur menjadi Promo Hari Ini atau Produk Terlaris.
- Admin dapat membuat, melihat, mengedit, mengarsipkan, dan menghapus produk, termasuk gambar, deskripsi, dan harga.
- Konten Indonesia menjadi sumber terjemahan otomatis ke Korea dan English. Hasilnya disimpan dan dapat dikoreksi admin.
- Pengunjung tidak perlu membuat akun. MVP tidak memerlukan payment gateway, checkout internal, atau keranjang lintas produk.
- Jangan membuat klaim penjualan, ulasan, diskon, sertifikasi, ataupun informasi pengiriman yang belum diberikan pemilik.

Jika kredensial eksternal belum tersedia, siapkan integrasi dan panduan konfigurasinya. Jangan menampilkan keberhasilan palsu atau menaruh rahasia di kode. Mode demo harus dipisahkan secara jelas dari mode produksi.

## 2. Stack dan arsitektur

| Bagian | Implementasi |
| --- | --- |
| Runtime | Node.js versi LTS yang masih didukung dan kompatibel dengan paket yang dipilih |
| Framework | Next.js App Router dengan TypeScript; gunakan rilis stabil, bukan canary |
| Rendering | Server rendering untuk katalog awal; client components untuk filter, modal, dan form |
| Styling | Tailwind CSS; komponen aksesibel dapat memakai shadcn/ui / Radix |
| Database | Supabase PostgreSQL |
| Auth admin | Supabase Auth, email dan password, session berbasis cookie melalui `@supabase/ssr` |
| Media | Supabase Storage |
| Validasi | Zod di server dan form client |
| Form | React Hook Form atau form server yang memberikan UX setara |
| Terjemahan | Google Cloud Translation Advanced v3 melalui adapter server |
| Pengujian | Vitest untuk logika bisnis; Playwright untuk alur utama |
| Package manager | npm; commit `package-lock.json` dan gunakan `npm ci` pada CI |

Gunakan satu aplikasi Next.js sebagai frontend sekaligus backend Node.js. Tidak perlu membuat service Express terpisah untuk MVP. Endpoint terjemahan dan pemrosesan gambar harus berjalan pada Node.js runtime.

Pin versi dependency yang sudah diuji. Catat versi Node.js pada `.nvmrc` atau `.node-version` dan `package.json`. Verifikasi kebutuhan versi melalui dokumentasi resmi saat mulai implementasi; jangan menganggap nomor versi dalam contoh lama sebagai versi produksi yang direkomendasikan.

Alur data:

1. Katalog membaca hanya produk terbit dan pengaturan publik yang diizinkan RLS.
2. Admin login melalui Supabase Auth dan lolos pemeriksaan allowlist admin.
3. Mutasi produk, gambar, promo, dan pengaturan diproses melalui backend dengan validasi dan otorisasi.
4. Setelah teks Indonesia disimpan, backend menerjemahkan field yang berubah dan menyimpan hasilnya di database.
5. Order menghasilkan tautan chat dan draf pesan. Pengguna tetap menekan tombol kirim di aplikasi chat.

## 3. Identitas visual dan pengalaman marketplace

Desain harus terlihat seperti toko makanan modern: bersih, hangat, cepat dipindai, dan menonjolkan foto produk. Hindari layout dashboard untuk halaman publik dan hindari hero berukuran satu layar penuh yang menyembunyikan katalog.

| Token | Arahan |
| --- | --- |
| Primary | Hijau tua `#166534` |
| Primary hover | `#14532D` |
| Accent | Lime lembut `#D9F99D` |
| Background | Ivory `#FAFAF5` |
| Surface | Putih `#FFFFFF` |
| Teks utama | `#17251D` |
| Teks sekunder | `#58665E` |
| Border | `#E5E7DF` |
| Font | Noto Sans dengan dukungan Noto Sans KR; font dapat di-host lokal |
| Radius | Kartu 16–20 px; tombol 10–14 px |
| Animasi | Transisi singkat 150–200 ms; hormati `prefers-reduced-motion` |

Foto produk memakai rasio 1:1, pencahayaan natural, dan crop konsisten. Gunakan foto asli milik toko ketika tersedia. Placeholder pengembangan tidak boleh menyiratkan kondisi produk aktual.

Navbar menampilkan nama atau logo Tempe Segar, kolom pencarian, dan pilihan bahasa. Ikon WhatsApp dan LINE menggunakan aset resmi atau ikon yang mudah dikenali. Logo teks sederhana cukup untuk awal jika logo resmi belum tersedia.

### Responsif

| Lebar layar | Perilaku |
| --- | --- |
| 320–359 px | Satu kolom bila dua kolom membuat isi tidak terbaca |
| 360–767 px | Dua kolom kartu, search bar penuh, chip kategori horizontal |
| 768–1023 px | Tiga kolom kartu |
| 1024 px ke atas | Empat kolom kartu; konten maksimal sekitar 1280 px |

Pada mobile, pilihan order memakai bottom sheet. Pada desktop, gunakan dialog terpusat. Tombol sentuh minimal 44 × 44 px, teks tetap terbaca pada zoom 200%, dan tidak ada horizontal overflow halaman.

## 4. Struktur halaman katalog

Susunan dari atas ke bawah:

1. Header ringkas dengan brand, pencarian, dan language switcher.
2. **Satu spot unggulan** untuk promo atau produk terlaris.
3. Judul katalog, kategori, filter, dan urutan produk.
4. Grid kartu produk.
5. Tombol muat lebih banyak bila jumlah produk melebihi satu batch.
6. Footer ringkas berisi kontak +821065653524 dan tautan chat yang tersedia.

Tombol kontak mengambang boleh digunakan jika tidak menutupi kartu, tombol order, bottom sheet, atau footer.

### 4.1 Pencarian, filter, dan urutan

- Pencarian berdasarkan nama produk aktif, nama Indonesia, dan SKU publik.
- Dukung Unicode dan pencarian teks Korea; jangan membuang karakter non-Latin.
- Kategori berupa chip; contoh pengembangan: Semua, Tempe Segar, Paket Tempe.
- Filter ketersediaan: Semua, Tersedia, Preorder.
- Urutan: Rekomendasi sebagai default, Terbaru, Harga Terendah, Harga Tertinggi.
- Harga untuk sorting adalah harga efektif saat ini, termasuk promo yang sedang aktif.
- Debounce pencarian sekitar 300 ms; tampilkan loading dan empty state yang jelas.
- Simpan pencarian/filter di query string agar refresh dan tombol Back tidak membingungkan.
- Gunakan batch awal sekitar 24 produk dan tombol Muat Lebih Banyak; tetap di halaman katalog yang sama.

### 4.2 Kartu produk

Setiap kartu menampilkan:

- Foto utama dan nama produk sesuai bahasa aktif.
- Ukuran/berat atau satuan jual, bila diisi.
- Harga efektif dalam Won.
- Harga normal dicoret dan badge diskon hanya jika diskon memang aktif dan valid.
- Badge manual seperti Produk Pilihan atau Terlaris, bila admin mengaktifkannya.
- Ketersediaan: Tersedia, Preorder, atau Habis.
- Tombol **Pesan**; untuk produk Habis, tombol dinonaktifkan.

Klik gambar atau nama membuka detail produk. Klik Pesan langsung membuka pemilih jumlah dan kanal chat. Jangan membuat seluruh kartu menjadi link yang bertabrakan dengan tombol di dalamnya.

### 4.3 Detail produk dalam modal/drawer

Tampilkan galeri gambar, nama, deskripsi, harga, ukuran/satuan, dan ketersediaan. Sediakan pemilih jumlah dengan default 1, minimum 1, maksimum 99. Untuk preorder, sampaikan bahwa ketersediaan dan waktu pemenuhan akan dikonfirmasi melalui chat.

Modal harus mendukung keyboard, focus trap, Escape, pengembalian fokus ke pemicu, dan scroll yang tidak mengganggu halaman di belakangnya. Tutup melalui tombol yang terlihat. Produk yang hilang atau tidak lagi terbit memberikan pesan yang sesuai, bukan layar error mentah.

## 5. Satu spot unggulan: promo atau produk terlaris

Admin dapat memilih salah satu mode untuk **satu slot**, tanpa menambah banyak banner bertumpuk.

| Mode | Perilaku |
| --- | --- |
| `promo` | Judul default Promo Hari Ini, teks pendek, satu produk pilihan, gambar, dan CTA Pesan Sekarang |
| `best_seller` | Judul default Produk Terlaris, satu produk pilihan, ringkasan, dan CTA Lihat Produk / Pesan |

Field konfigurasi: aktif/nonaktif, mode, produk pilihan, judul Indonesia, subjudul Indonesia, label CTA, gambar opsional, waktu mulai opsional, dan waktu selesai opsional. Judul, subjudul, dan label CTA mendukung tiga bahasa dan auto-translate.

Ketentuan:

- Bila belum dikonfigurasi, slot dapat disembunyikan. Jangan menampilkan kartu kosong.
- Jika promo berakhir, nonaktif, produknya diarsipkan, atau produknya Habis, gunakan fallback produk unggulan yang masih layak atau sembunyikan slot.
- Penjadwalan memakai zona waktu **Asia/Seoul** untuk tampilan admin dan UTC pada database.
- Waktu aktif menggunakan interval `starts_at <= now < ends_at`; batas kosong berarti tidak dibatasi pada sisi tersebut.
- Harga slot selalu memakai resolver harga yang sama dengan kartu produk. Tanggal banner tidak boleh memperpanjang masa diskon produk.
- Label Terlaris merupakan pilihan editorial admin pada MVP karena transaksi berlangsung di luar website. Jangan menghitung penjualan dari jumlah klik chat.
- Countdown bersifat opsional dan hanya boleh muncul jika tanggal selesai benar-benar ditentukan.

## 6. Bahasa dan lokalisasi

| Bahasa | Kode | Label switcher | Rute |
| --- | --- | --- | --- |
| Indonesia | `id` | Indonesia | `/` |
| Korea | `ko` | 한국어 | `/ko` |
| English | `en` | English | `/en` |

Ketiga rute menggunakan satu template katalog yang sama. `/id` boleh redirect permanen ke `/`. Rute admin terpisah dan tidak dihitung sebagai halaman katalog.

Aturan bahasa:

- `/` selalu menampilkan Indonesia; URL menjadi sumber utama bahasa.
- Jangan redirect otomatis dari bahasa browser. Preferensi terakhir boleh disimpan, tetapi tidak boleh mengalahkan bahasa pada URL yang sedang dibuka.
- Saat switcher digunakan, pertahankan pencarian/filter yang relevan dan produk yang sedang dibuka bila memungkinkan.
- Terjemahkan navbar, kategori, filter, dialog, tombol, pesan error, status stok, footer, metadata, dan draf pesan order.
- Set atribut `lang` HTML sesuai bahasa halaman. Semua bahasa memakai arah LTR.
- Jika terjemahan produk belum tersedia, tampilkan konten Indonesia dengan atribut `lang="id"` pada bagian fallback. Jangan membuat katalog rusak atau menampilkan teks `undefined`.
- Nama brand **Tempe Segar** tetap sama pada semua bahasa.

Contoh dictionary UI awal yang wajib dapat disunting developer:

| Key | Indonesia | 한국어 | English |
| --- | --- | --- | --- |
| `catalog.title` | Katalog Produk | 상품 목록 | Product Catalog |
| `search.placeholder` | Cari produk tempe… | 템페 상품 검색… | Search tempe products… |
| `category.all` | Semua | 전체 | All |
| `promo.today` | Promo Hari Ini | 오늘의 할인 | Today's Deals |
| `promo.bestSeller` | Produk Terlaris | 베스트셀러 | Best Sellers |
| `order.cta` | Pesan | 주문하기 | Order |
| `order.channel` | Pilih cara pemesanan | 주문 방법 선택 | Choose how to order |
| `order.quantity` | Jumlah | 수량 | Quantity |
| `order.whatsapp` | Pesan lewat WhatsApp | WhatsApp으로 주문 | Order via WhatsApp |
| `order.line` | Pesan lewat LINE | LINE으로 주문 | Order via LINE |
| `stock.available` | Tersedia | 구매 가능 | Available |
| `stock.preorder` | Preorder | 예약 주문 | Preorder |
| `stock.out` | Habis | 품절 | Sold Out |
| `catalog.empty` | Produk tidak ditemukan | 검색 결과가 없습니다 | No products found |
| `order.copy` | Salin pesan | 메시지 복사 | Copy message |

Gunakan dictionary statis untuk UI. Jangan menghubungi API terjemahan setiap kali pengunjung mengganti bahasa.

## 7. Auto-translate konten admin

### 7.1 Konten yang diterjemahkan

Terjemahkan nama produk, deskripsi ringkas, deskripsi lengkap, teks satuan, nama kategori, alt text gambar, dan konten spot unggulan. Harga, SKU, nomor telepon, URL, dan nama brand tidak diterjemahkan.

Produk selalu memiliki sumber Indonesia. Admin mengisi sumber satu kali, kemudian Korea dan English dapat dihasilkan otomatis. Tab per bahasa memungkinkan admin melihat dan memperbaiki hasilnya.

Provider default adalah Google Cloud Translation Advanced v3 melalui `@google-cloud/translate`. Gunakan `sourceLanguageCode: "id"`, target `ko` dan `en`, serta konten `text/plain`. Semua pemanggilan dilakukan di server dengan kredensial server.

### 7.2 Alur penyimpanan MVP yang konkret

1. Backend memvalidasi form dan menyimpan data sumber ke Supabase dalam transaksi database.
2. Jika field yang dapat diterjemahkan berubah, increment `source_revision` dan hitung `source_hash` dari field tersebut. Perubahan harga/gambar tanpa perubahan teks tidak menghabiskan kuota terjemahan.
3. Dalam request server yang sama, **await** penerjemahan target Korea dan English secara paralel dengan timeout terbatas. Jangan memakai fire-and-forget setelah response dikirim.
4. Simpan setiap hasil hanya jika revisi sumber produk masih sama dengan revisi saat request dimulai. Hasil request lama harus dibuang.
5. Return data produk beserta hasil per bahasa. Teks sumber tetap tersimpan jika provider gagal; admin melihat peringatan dan tombol Coba Lagi.
6. Simpan status agar retry setelah timeout atau refresh dapat dilakukan. Tidak diperlukan worker background untuk MVP ini.

Terapkan pola yang sama pada kategori dan spot unggulan. Jika lingkungan hosting tidak mendukung durasi request yang diperlukan, gunakan antrean persisten dan worker yang benar-benar dijalankan; jangan menggantinya dengan promise yang tidak ditunggu.

### 7.3 Status, koreksi, dan kegagalan

- Status per target: `missing`, `pending`, `ready`, `failed`, atau `needs_review`.
- Simpan `source_revision`, `source_hash`, `origin` (`machine` atau `manual`), `is_locked`, serta timestamp pada hasil terjemahan.
- Hasil `ready` hanya boleh digunakan publik bila revisinya cocok dengan sumber saat ini.
- Hasil `manual` yang dikunci tidak boleh ditimpa otomatis. Ketika sumber berubah, tandai `needs_review`; admin dapat menyetujui setelah meninjau atau meminta terjemahan ulang secara eksplisit.
- Saat target gagal atau kedaluwarsa, gunakan fallback Indonesia, bukan hasil lama yang berpotensi menjelaskan produk berbeda.
- Jangan mengganti hasil yang masih valid dengan string kosong ketika provider gagal.
- Request dengan source hash dan target yang sama memakai hasil tersimpan; cegah duplikasi request aktif.
- Gunakan timeout awal sekitar 8 detik per panggilan dan retry terbatas hanya untuk error sementara. Tampilkan status yang dapat dipahami admin.
- API key/kredensial yang belum diisi menghasilkan pesan Konfigurasi terjemahan belum tersedia; jangan menandai status `ready`.
- Batasi endpoint, misalnya 10 permintaan terjemahan per menit per admin, dengan penyimpanan pembatas yang bekerja lintas instance.
- Tetapkan kuota/budget provider dan batas panjang input. Terjemahan hanya berjalan setelah mutasi admin, bukan pada kunjungan katalog.

Gunakan adapter seperti `translateFields({ sourceLocale, targetLocale, fields })` agar provider dapat diganti. Implementasi awal cukup satu provider, tanpa membuat sistem plugin yang berlebihan.

## 8. Harga Won dan aturan promo produk

- Simpan `price_krw` sebagai integer positif, tanpa desimal.
- Simpan `sale_price_krw` sebagai integer positif atau `null`; jika ada, nilainya wajib lebih kecil dari harga normal.
- Simpan `sale_starts_at` dan `sale_ends_at` sebagai `timestamptz` opsional. Akhir wajib setelah awal jika keduanya diisi.
- Harga efektif adalah harga promo hanya jika nilainya valid dan waktu promo sedang aktif. Selain itu gunakan harga normal.
- Nilai harga tidak diproses oleh mesin penerjemah.
- Tampilkan konsisten, misalnya **₩5,000**, **₩10,000**, tanpa pecahan dan tanpa konversi kurs.
- Pakai formatter terpusat, misalnya `Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", minimumFractionDigits: 0, maximumFractionDigits: 0 })`.
- Subtotal sama dengan harga efektif × jumlah. Ongkir tidak dimasukkan sampai dikonfirmasi penjual melalui chat.
- Diskon persentase dihitung dari harga normal dan harga promo aktif, bukan angka badge yang diketik terpisah.
- Gunakan waktu server untuk menentukan promo. UI memperbarui atau memuat ulang data ketika promo berakhir selama halaman masih terbuka.

Contoh harga dalam dokumen ini adalah **data demo**, bukan harga jual aktual toko.

## 9. Order lewat WhatsApp atau LINE

### 9.1 Alur pengunjung

1. Pengunjung klik Pesan pada kartu atau detail produk.
2. Tampilkan nama produk, harga terkini, jumlah yang dapat diubah, dan subtotal indikatif.
3. Tampilkan pilihan WhatsApp dan LINE yang tersedia, tanpa memilih kanal otomatis.
4. Ketika kanal dipilih, validasi ulang bahwa produk masih terbit, dapat dipesan, serta harga/jumlah masih valid. Gunakan data terbaru dari server.
5. Bila harga berubah, minta pengunjung meninjau subtotal baru sebelum melanjutkan.
6. Buka chat dengan draf pesan sesuai bahasa aktif. Pengiriman pesan dilakukan pengguna di aplikasi chat.

Hasil klik adalah perpindahan ke chat, bukan bukti transaksi selesai. Jangan menampilkan Order Berhasil, mengurangi stok, atau menghitung omzet hanya karena link dibuka.

### 9.2 WhatsApp

Nomor tampilan: **+821065653524**. Nomor pada click-to-chat: **821065653524**.

```ts
const whatsappNumber = "821065653524";
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
```

Gunakan nomor yang diberikan pemilik. Tautan perlu diuji pemilik pada akun WhatsApp aktif sebelum rilis; spesifikasi ini tidak memverifikasi status akun nomor tersebut.

### 9.3 LINE

Nomor +821065653524 tetap dapat dicantumkan sebagai kontak. Untuk membuka chat tujuan di LINE, sediakan pengaturan **LINE Official Account ID** atau **tautan LINE toko yang dibagikan pemilik**. Jangan menebak ID dari nomor telepon.

Jika toko memakai LINE Official Account, dukung format resmi berikut:

```ts
const lineUrl = `https://line.me/R/oaMessage/${encodeURIComponent(lineOfficialId)}/?${encodeURIComponent(message)}`;
```

`lineOfficialId` adalah ID sebenarnya, termasuk `@` bila ada. Jangan mengganti format query LINE menjadi `?text=` karena formatnya berbeda dari WhatsApp.

Untuk tautan LINE yang dibagikan pemilik, misalnya tautan tambah teman, buka tautan tersebut tanpa memaksakan parameter pesan. Sediakan tombol Salin Pesan agar pengguna dapat menempelkan pesan secara manual.

Kondisi awal bila konfigurasi LINE kosong:

- Tetap bangun komponen pilihan WhatsApp dan LINE.
- WhatsApp dapat digunakan setelah nomor diuji.
- Pilihan LINE dinonaktifkan dengan teks lokal Belum tersedia; jangan membuat tautan kosong atau tautan palsu.
- Dashboard menampilkan field dan petunjuk untuk mengisi ID/tautan LINE. Setelah konfigurasi valid, pilihan LINE otomatis aktif.

Validasi URL melalui parser URL. Izinkan HTTPS dan host LINE resmi yang relevan seperti `line.me` atau `lin.ee`; jangan izinkan `javascript:`, host tiruan, ataupun redirect URL bebas.

### 9.4 Draf pesan order

Contoh Indonesia:

```text
Halo Tempe Segar, saya ingin memesan:

Produk: Tempe Segar 500 g
Kode: TMP-001
Harga satuan: ₩5,000
Jumlah: 2
Subtotal produk: ₩10,000

Mohon konfirmasi ketersediaan, ongkir, dan cara pembayaran.
Tautan produk: {canonical_catalog_url}?product={product_uuid}
```

Contoh Korea:

```text
안녕하세요, Tempe Segar 상품을 주문하고 싶습니다.

상품: {product_name_ko}
상품 코드: {sku}
단가: {unit_price_krw}
수량: {quantity}
상품 소계: {subtotal_krw}

재고, 배송비 및 결제 방법을 확인해 주세요.
상품 링크: {product_url}
```

Contoh English:

```text
Hello Tempe Segar, I would like to order:

Product: {product_name_en}
Product code: {sku}
Unit price: {unit_price_krw}
Quantity: {quantity}
Product subtotal: {subtotal_krw}

Please confirm availability, shipping fees, and payment options.
Product link: {product_url}
```

Tautan produk tetap mengarah ke halaman katalog bahasa aktif dengan query `product`. Saat dibuka, query tersebut membuka detail produk setelah data tersedia. Jangan memasukkan seluruh deskripsi atau HTML ke pesan order.

Sediakan salin pesan dan tautan chat biasa sebagai fallback bila popup diblokir atau aplikasi belum terpasang. Gunakan `rel="noopener noreferrer"` untuk tab eksternal. Pesan tidak boleh dikirim otomatis oleh website.

## 10. Dashboard admin

Rute admin boleh memiliki beberapa halaman dan harus nyaman di laptop maupun ponsel.

| Rute | Fungsi |
| --- | --- |
| `/admin/login` | Login admin |
| `/admin` | Ringkasan produk dan konten yang perlu diperiksa |
| `/admin/products` | Daftar produk, pencarian, filter, urutan |
| `/admin/products/new` | Tambah produk |
| `/admin/products/[id]/edit` | Edit produk, gambar, dan terjemahan |
| `/admin/categories` | CRUD kategori |
| `/admin/featured` | Atur satu spot promo/terlaris |
| `/admin/settings` | Nama toko, kontak, konfigurasi LINE, dan teks publik |

Ringkasan awal: jumlah produk terbit, draft, produk Habis, promo aktif, dan terjemahan gagal/perlu diperiksa. Jangan menampilkan omzet atau total pesanan tanpa sumber transaksi yang nyata.

### 10.1 Form produk

Field yang wajib didukung:

- Nama Indonesia, SKU unik, slug internal stabil, dan kategori opsional.
- Deskripsi singkat dan deskripsi lengkap berupa plain text.
- Harga normal Won, harga promo opsional, dan tanggal promo opsional.
- Teks satuan jual, misalnya 500 g atau per kemasan.
- Ketersediaan `available`, `preorder`, atau `out_of_stock`.
- Status `draft` atau `published`.
- Foto utama serta galeri, maksimal 8 gambar per produk.
- Urutan tampil, flag produk rekomendasi, dan flag terlaris manual.
- Tab Indonesia, 한국어, English beserta status auto-translate dan koreksi manual.

Validasi awal: nama 2–120 karakter, deskripsi singkat maksimal 240 karakter, deskripsi lengkap maksimal 5.000 karakter, satuan maksimal 80 karakter, SKU maksimal 40 karakter. Validasi wajib berjalan di server; pesan error ditempatkan pada field terkait.

Untuk terbit, produk wajib memiliki nama Indonesia, SKU, harga valid, dan minimal satu gambar valid. Terjemahan gagal tidak menghilangkan produk; katalog memakai fallback Indonesia. Terapkan `updated_at`/revision guard agar edit bersamaan tidak saling menimpa tanpa peringatan.

### 10.2 CRUD dan pengelolaan gambar

- Drag-and-drop, pilih dari perangkat, preview, progress upload, ganti foto, urutkan, dan pilih gambar utama.
- Jenis yang diizinkan: JPEG, PNG, WebP. Tolak SVG dan file non-gambar untuk upload produk.
- Maksimal 5 MB per file sebelum pemrosesan, dengan batas dimensi/pixel agar gambar berbahaya tidak menghabiskan memori.
- Periksa file signature dan decode gambar di server, bukan hanya ekstensi atau MIME dari browser.
- Re-encode gambar, normalisasi orientasi, hapus metadata yang tidak diperlukan, dan buat ukuran yang sesuai katalog.
- Nama objek memakai UUID; jangan overwrite path lama agar cache tidak menampilkan gambar sebelumnya.
- Simpan path Storage, urutan, dimensi, dan alt text; jangan menyimpan base64 di tabel produk.
- Ganti gambar secara aman: upload baru, commit referensi baru, lalu bersihkan objek lama yang tidak direferensikan.
- Jika upload/commit gagal, lakukan kompensasi atau cleanup terjadwal untuk orphan. Jangan menghapus gambar yang masih dipakai.
- Bucket gambar katalog boleh publik karena merupakan materi etalase. Kebijakan tulis/hapus tetap hanya admin; jangan memasukkan dokumen pribadi atau rahasia ke bucket ini.

Arsipkan produk untuk menghilangkannya dari katalog. Hapus permanen memerlukan konfirmasi yang menyebut nama produk; bersihkan galeri, terjemahan, dan relasi spot unggulan secara terkendali.

### 10.3 Pengaturan toko

Kontak awal adalah +821065653524. Form pengaturan menyimpan nomor WhatsApp, LINE Official Account ID atau tautan LINE toko, serta status aktif kanal. Jika keduanya diisi, mode LINE harus dipilih jelas: `official_account` atau `shared_link`.

Admin juga dapat mengelola logo/foto toko dan teks ringkas publik. Kredensial Supabase dan Google Cloud tetap dikelola lewat environment hosting, bukan field publik dashboard.

## 11. Rancangan database Supabase

Gunakan migrations yang dapat dijalankan ulang dari lingkungan kosong. Skema berikut adalah kontrak kebutuhan; developer wajib menghasilkan SQL lengkap, constraint, indeks, RLS, dan tipe TypeScript.

| Tabel | Field inti dan aturan |
| --- | --- |
| `products` | UUID `id`, `sku` unik, `slug` unik, `category_id` nullable, `name_id`, `short_description_id`, `description_id`, `unit_label_id`, `price_krw`, `sale_price_krw`, `sale_starts_at`, `sale_ends_at`, `availability`, `status`, `is_recommended`, `is_best_seller`, `sort_order`, `source_revision`, `source_hash`, `created_at`, `updated_at`, `deleted_at` nullable |
| `product_translations` | UUID `id`, `product_id` FK cascade, `locale` hanya `ko`/`en`, nama/deskripsi/satuan target, `source_revision`, `source_hash`, `status`, `origin`, `is_locked`, timestamps; unik `(product_id, locale)` |
| `product_images` | UUID `id`, `product_id` FK cascade, `storage_path`, `sort_order`, dimensi, `alt_id`, `alt_ko`, `alt_en`, `alt_source_revision`, timestamps; gambar pertama menjadi cover |
| `categories` | UUID `id`, `slug` unik, `name_id`, `sort_order`, `is_active`, `source_revision`, `source_hash`, timestamps |
| `category_translations` | `category_id` FK cascade, `locale`, `name`, revisi/hash/status/origin/lock, timestamps; unik `(category_id, locale)` |
| `featured_spot` | Singleton `id = 1`, `enabled`, `mode`, `product_id` FK set null, judul/subjudul/CTA Indonesia, `image_path` nullable, jadwal, revisi/hash, timestamps |
| `featured_translations` | `featured_spot_id` FK, `locale`, judul/subjudul/CTA target, revisi/hash/status/origin/lock, timestamps; unik per slot dan locale |
| `store_settings` | Singleton, `store_name`, `contact_display`, `whatsapp_number`, `whatsapp_enabled`, `line_mode`, `line_official_id`, `line_url`, `line_enabled`, teks publik tiga bahasa, timestamps; hanya konfigurasi publik |
| `private.admin_users` | `user_id` FK ke `auth.users`, `is_active`, timestamps; sumber otorisasi admin yang tidak dapat dimutasi client |
| `private.translation_attempts` | Entity/type, target locale, source revision/hash, status, waktu, error tersanitasi, idempotency key; untuk retry/deduplikasi, tidak berisi rahasia provider |

Alt text gambar yang diterjemahkan harus mengikuti aturan revisi dan lock juga. Field metadata tambahan dapat disimpan pada tabel translasi gambar tersendiri bila diperlukan; jangan menandai alt text lama sebagai terjemahan mutakhir setelah sumbernya berubah.

Constraint dan indeks minimum:

- `price_krw > 0`; `sale_price_krw IS NULL OR (sale_price_krw > 0 AND sale_price_krw < price_krw)`.
- Jadwal selesai sesudah mulai jika keduanya ada; waktu disimpan sebagai `timestamptz`.
- Enum/check constraint untuk locale, status publikasi, ketersediaan, mode spot, dan status terjemahan.
- Singleton slot dan pengaturan ditegakkan lewat primary key/check, bukan asumsi UI.
- FK kategori memakai `ON DELETE SET NULL`; hapus kategori tidak ikut menghapus produk.
- Unik `sort_order` per produk untuk gambar, atau normalisasi urutan secara transaksional.
- Indeks `(status, deleted_at, sort_order)`, `category_id`, `created_at`, serta lookup foreign key terjemahan/gambar.
- `updated_at` dikelola server/database. Revision sumber diubah server, bukan dipercaya dari client.
- Penyimpanan produk dan batch relasi memakai transaksi/RPC yang tetap memeriksa otorisasi. Jangan memberi `SECURITY DEFINER` luas hanya untuk melewati RLS.

Jangan menaruh credential provider, biaya internal toko, daftar admin, atau log error rahasia pada tabel yang dapat dibaca publik.

## 12. Auth admin, RLS, dan keamanan

### 12.1 Auth dan otorisasi

- Admin login menggunakan Supabase Auth. Tidak ada halaman pendaftaran publik.
- Akun admin pertama dibuat lewat Supabase Dashboard/CLI atau script bootstrap server yang dijalankan pemilik.
- Hak admin berasal dari `private.admin_users`, bukan field profil atau `user_metadata` yang dapat diubah pengguna.
- Sediakan helper database seperti `private.is_admin()` yang memeriksa `auth.uid()` terhadap allowlist aktif. Jika `SECURITY DEFINER` diperlukan, tetapkan `search_path` yang aman, gunakan nama objek berkualifikasi, batasi privilege, dan jangan menerima user ID bebas untuk pemeriksaan caller.
- Verifikasi identitas pada server memakai pola resmi Supabase saat implementasi, misalnya `getClaims()` atau `getUser()`. Jangan menggunakan objek dari `getSession()` sebagai satu-satunya bukti otorisasi.
- Setiap endpoint/mutasi memeriksa session **dan** status admin aktif; proteksi layout atau redirect client saja tidak cukup.
- Request admin menggunakan session client yang tunduk pada RLS. Publishable key bukan bukti bahwa pengguna admin.
- Session kedaluwarsa mengarahkan ke login dengan return URL internal yang divalidasi.

### 12.2 Matriks akses

| Data/aksi | Publik / user biasa | Admin aktif |
| --- | --- | --- |
| Produk | Baca hanya `published` dan `deleted_at IS NULL` | Baca dan CRUD semua produk |
| Terjemahan/gambar produk | Baca hanya jika parent produk boleh terlihat | CRUD |
| Kategori | Baca hanya kategori aktif | CRUD |
| Spot unggulan | Baca hanya konfigurasi publik aktif; aplikasi tetap memeriksa jadwal/kelayakan produk | Ubah singleton |
| Pengaturan toko | Baca field kontak dan konten publik yang diperlukan | Ubah field yang diizinkan |
| Upload/update/delete Storage | Ditolak | Diizinkan hanya untuk bucket/path katalog yang ditentukan |
| `private.admin_users` | Ditolak | Tidak dikelola dari browser pada MVP |
| Riwayat internal terjemahan | Ditolak | Baca status tersanitasi melalui endpoint admin |

Aktifkan RLS pada seluruh tabel yang diekspos. User yang berhasil login tetapi tidak ada dalam allowlist tetap tidak mendapat hak admin. Buat policy anak melalui pemeriksaan parent, bukan membolehkan seluruh tabel terjemahan dibaca publik.

Jika memakai view publik, gunakan view yang menghormati RLS seperti `security_invoker = true` pada versi PostgreSQL yang mendukungnya, serta grant kolom/privilege secara tepat. Pisahkan data privat dari view/serializer publik.

### 12.3 Proteksi aplikasi

- Rahasia Supabase dan kredensial terjemahan hanya di server; jangan gunakan prefix `NEXT_PUBLIC_`.
- Rute katalog publik tidak menggunakan secret/service-role key untuk mengambil data.
- Jangan menganggap RLS tabel otomatis mengamankan Storage; buat policy bucket/objek tersendiri.
- Validasi input, UUID, harga, jumlah, MIME, ukuran gambar, dan URL di server.
- Render deskripsi sebagai plain text. Jangan menggunakan HTML mentah dari admin atau terjemahan.
- Terapkan proteksi CSRF/origin untuk mutasi cookie-auth, pembatas login/terjemahan/upload, dan error yang tidak mengungkap rahasia.
- Gunakan HTTPS dan security headers yang sesuai. Hindari mencatat token, credential, atau isi cookie.
- Respons admin/session tidak boleh masuk cache publik atau CDN bersama.
- Endpoint order hanya membentuk link HTTPS yang telah diizinkan; jangan menjadi open redirect.

## 13. Kontrak endpoint dan layanan

Path berikut dapat diimplementasikan sebagai Route Handlers. Jika memakai Server Actions untuk form admin, pertahankan validasi, otorisasi, serta perilaku yang sama dan hindari duplikasi logika.

| Method dan path | Tujuan |
| --- | --- |
| `GET /api/catalog` | Produk publik, locale, query, kategori, sort, limit/cursor |
| `GET /api/catalog/products/[id]` | Data produk publik untuk detail dan validasi harga terkini |
| `POST /api/order-link` | Validasi produk/jumlah/kanal, bentuk harga dan pesan terbaru; tidak membuat transaksi penjualan |
| `POST /api/admin/products` | Buat produk dan mulai penerjemahan setelah sumber tersimpan |
| `PATCH /api/admin/products/[id]` | Edit dengan revision guard dan update terjemahan bila teks berubah |
| `DELETE /api/admin/products/[id]` | Arsip/hapus sesuai operasi eksplisit dan otorisasi |
| `POST /api/admin/products/[id]/translate` | Retry target gagal atau regenerasi target yang diizinkan |
| `POST /api/admin/media` | Upload dan validasi gambar |
| `DELETE /api/admin/media/[id]` | Hapus referensi/objek media yang diizinkan |
| `GET/POST/PATCH/DELETE /api/admin/categories...` | CRUD kategori dengan kontrak parent/child yang jelas |
| `GET/PATCH /api/admin/featured` | Baca/edit satu spot unggulan |
| `GET/PATCH /api/admin/settings` | Baca/edit pengaturan toko |

`POST /api/order-link` menerima `productId`, `quantity`, `locale`, `channel`, dan `expectedUnitPriceKrw` sebagai nilai pembanding dari harga yang sedang dilihat pengunjung. Server tetap membaca produk terkini dan menghitung pesan sendiri; harga client tidak pernah menjadi sumber harga. Jika harga server berbeda, return 409 beserta harga/subtotal baru dan minta pengguna meninjau sebelum mencoba lagi. Jangan menerima message bebas sebagai sumber isi order. Batasi rate tanpa mewajibkan login pengunjung.

Respons error gunakan bentuk konsisten `{ code, message, fieldErrors? }`. Bedakan status 400/422 untuk input salah, 401 untuk belum login, 403 untuk bukan admin, 404 untuk produk tidak terlihat, 409 untuk konflik edit/perubahan harga, dan 429 untuk batas request. Jangan mengirim stack trace ke browser.

## 14. Cache, SEO, performa, dan aksesibilitas

- Katalog awal harus dapat dirender server agar nama/harga bisa dibaca mesin pencari.
- Metadata judul: Tempe Segar, dengan deskripsi sesuai bahasa halaman.
- Tetapkan canonical per locale dan `hreflang` untuk `id`, `ko`, `en`; `x-default` mengarah ke `/`.
- Query filter/modal tidak membuat halaman SEO baru; canonical tetap root katalog bahasanya.
- Sitemap cukup berisi tiga rute katalog. Rute admin memakai `noindex`; otorisasi tetap wajib.
- Sertakan Open Graph dan favicon. Domain, logo resmi, dan informasi usaha diisi pemilik; jangan mengarang alamat.
- Gunakan image optimization, dimensi eksplisit, responsive sizes, dan lazy loading kecuali gambar utama yang diperlukan.
- Invalidate cache katalog ketiga bahasa setelah mutasi produk, kategori, gambar, spot, dan pengaturan.
- Cache publik harus mempertimbangkan batas waktu promo; jangan menyajikan diskon kedaluwarsa dari cache yang terlalu lama.
- Validasi order selalu memakai data terbaru tanpa cache yang dapat mempertahankan harga lama.
- Pisahkan cache publik dan admin. Rute login atau respons yang membawa session/cookie tidak boleh di-cache bersama.
- Target pengembangan: LCP di bawah sekitar 2,5 detik, CLS di bawah 0,1 pada kondisi uji yang dicatat; bukan klaim hasil sebelum pengukuran.
- Semua tombol memiliki nama aksesibel, focus ring terlihat, kontras memadai, dan gambar memiliki alt text.
- Loading, empty, error, retry, dan image fallback harus dirancang pada katalog dan dashboard.

## 15. Struktur proyek yang disarankan

```text
tempe-segar/
  app/
    (catalog)/
      page.tsx
      ko/page.tsx
      en/page.tsx
    admin/
      login/page.tsx
      (protected)/
        layout.tsx
        page.tsx
        products/
        categories/
        featured/
        settings/
    api/
      catalog/
      order-link/
      admin/
    layout.tsx
    globals.css
  components/
    catalog/
    admin/
    shared/
    ui/
  lib/
    supabase/{client,server}.ts
    auth/require-admin.ts
    i18n/
    pricing.ts
    order-links.ts
    translation/
    media/
    validation/
  messages/{id,ko,en}.json
  supabase/
    migrations/
    seed.sql
  scripts/
  tests/
  public/
  .env.example
  .nvmrc
  package.json
  package-lock.json
  README.md
```

Tiga file halaman katalog mengimpor komponen halaman yang sama dengan parameter locale. Hindari menyalin seluruh layout tiga kali. Tambahkan file refresh session sesuai konvensi versi Next.js/Supabase yang benar-benar dipakai, bukan otomatis menyalin middleware lama.

## 16. Environment dan persiapan pemilik

Contoh `.env.example` tanpa credential aktual:

```dotenv
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

TRANSLATION_PROVIDER=google
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=/absolute/server-only/path/google-credentials.json
```

`GOOGLE_APPLICATION_CREDENTIALS` menunjuk file yang tersedia pada server, bukan file yang dikirim ke browser atau dimasukkan git. Pada hosting yang mendukung workload identity/Application Default Credentials, gunakan mekanisme tersebut dan sesuaikan panduan. Tidak perlu menyimpan secret Supabase untuk CRUD biasa jika session admin dan RLS sudah memadai.

Nomor WhatsApp dan ID/tautan LINE disimpan sebagai konfigurasi toko melalui seed awal dan dashboard. Default nomor WhatsApp adalah `821065653524`; LINE masih kosong sampai diisi pemilik. Jangan membuat dua sumber konfigurasi yang saling menimpa antara environment dan database tanpa aturan yang jelas.

Persiapan:

1. Project Supabase, URL, publishable key, migrations, dan bucket katalog.
2. Akun admin pertama beserta allowlist admin.
3. Google Cloud project, aktivasi Cloud Translation, billing/kuota, dan kredensial server bila auto-translate akan digunakan.
4. Domain produksi, foto produk asli, nama produk, ukuran, serta harga Won aktual.
5. Konfirmasi bahwa nomor WhatsApp aktif dan LINE Official Account ID atau tautan LINE toko yang benar.

Jangan menjadikan LINE yang belum diisi sebagai penghalang membangun katalog atau WhatsApp. Katalog harus tetap berfungsi jika provider terjemahan sementara tidak tersedia.

## 17. Data demo untuk development

Gunakan seed terpisah yang jelas ditandai sebagai demo dan tidak otomatis dimasukkan ke produksi.

| SKU | Nama Indonesia | Harga demo | Status demo |
| --- | --- | --- | --- |
| TMP-001 | Tempe Segar 500 g | ₩5,000 | Tersedia |
| TMP-002 | Tempe Segar 1 kg | ₩9,000 | Tersedia |
| TMP-003 | Paket Tempe 3 × 500 g | ₩14,000 | Preorder |
| TMP-004 | Tempe Iris 500 g | ₩5,500 | Habis |

Tambahkan sumber Indonesia dan hasil contoh Korea/English untuk menguji layout. Tandai fixture sebagai demo; hasil fixture tidak boleh dianggap hasil API nyata. Pilih satu produk demo untuk slot unggulan agar implementasi dapat direview tanpa mengisi semua data terlebih dahulu.

## 18. Tahap implementasi

1. **Fondasi:** scaffold Next.js, theme, TypeScript, dictionary UI, environment validation, dan shared layout.
2. **Supabase:** migrations, constraint/index, bucket/policy Storage, RLS, tipe database, serta bootstrap admin.
3. **Katalog:** SSR data publik, pencarian/filter, grid responsif, detail modal, dan tiga locale.
4. **Order:** jumlah/subtotal, pemilih kanal, pesan lokal, validasi harga terkini, WhatsApp, dan integrasi LINE sesuai konfigurasi.
5. **Admin:** login/proteksi, CRUD produk/kategori, upload/replace/delete/reorder gambar, dan pengaturan toko.
6. **Konten unggulan:** singleton promo/terlaris, jadwal Asia/Seoul, dan fallback produk.
7. **Terjemahan:** adapter provider, revisi/hash, auto-translate setelah simpan, manual override, lock, dan retry.
8. **Penyelesaian:** SEO/cache, pengujian keamanan dan alur utama, dokumentasi konfigurasi, serta build produksi.

Selesaikan fungsi inti sebelum menambah fitur opsional. Jangan menambah akun pelanggan, pembayaran online, loyalty points, fake review, atau dashboard penjualan pada MVP.

## 19. Acceptance criteria dan pengujian

Implementasi dinyatakan selesai jika seluruh kebutuhan berikut terpenuhi, atau dependensi eksternal yang belum diisi dilaporkan secara spesifik.

### Katalog dan desain

- [ ] Brand/judul website adalah Tempe Segar dan halaman publik berbentuk katalog marketplace modern.
- [ ] `/` menampilkan Indonesia tanpa dipaksa mengikuti bahasa browser.
- [ ] `/ko` dan `/en` menampilkan template katalog yang sama dengan UI lokal lengkap.
- [ ] Detail produk tetap berada pada halaman katalog.
- [ ] Tampilan diuji pada lebar 320, 375, 768, 1024, dan 1440 px tanpa overflow halaman.
- [ ] Pencarian Korea, filter kategori/ketersediaan, sort harga efektif, dan muat lebih banyak berfungsi.
- [ ] Hanya ada satu slot unggulan; promo/produk yang tidak layak tidak meninggalkan spot rusak.
- [ ] Semua harga menggunakan KRW/Won tanpa pecahan dan tanpa konversi.

### Order

- [ ] Klik Pesan menampilkan jumlah, subtotal, dan pilihan WhatsApp/LINE sebelum navigasi.
- [ ] WhatsApp menuju `wa.me/821065653524` dengan pesan URL-encoded sesuai bahasa.
- [ ] LINE Official Account memakai ID yang dikonfigurasi dan format URL resmi; shared link memiliki fallback salin pesan.
- [ ] LINE kosong menghasilkan pilihan nonaktif yang jelas, tanpa tautan palsu.
- [ ] Produk Habis, tidak terbit, atau dihapus tidak dapat dipesan lewat endpoint langsung.
- [ ] Harga yang berubah saat modal terbuka meminta tinjauan ulang; promo kedaluwarsa tidak dipakai.
- [ ] Emoji, spasi, tanda baca, dan karakter Korea tidak merusak URL pesan.
- [ ] Kegagalan membuka aplikasi tidak menghilangkan pilihan salin pesan/tautan.
- [ ] Website tidak mengklaim pesanan selesai sebelum ada proses transaksi di luar website.

### Admin dan data

- [ ] Publik dan user login non-admin ditolak pada seluruh mutasi admin, termasuk Storage dan endpoint terjemahan.
- [ ] Admin dapat membuat, melihat, mengedit, mengarsipkan, dan menghapus produk.
- [ ] Upload, ganti, urutkan, pilih cover, dan hapus gambar benar-benar tersimpan di Supabase.
- [ ] Perubahan data muncul pada katalog semua bahasa setelah cache di-invalidasi.
- [ ] Produk draft tidak terlihat melalui katalog, detail endpoint publik, ataupun relasi translasi/gambar publik di database.
- [ ] Konflik dua edit admin tidak menimpa perubahan secara diam-diam.
- [ ] File salah format, gambar terlalu besar, harga negatif/desimal, dan URL kanal tidak valid ditolak server.

### Terjemahan

- [ ] Simpan teks Indonesia memicu terjemahan Korea dan English yang hasilnya tersimpan.
- [ ] Pergantian bahasa pengunjung tidak memanggil API terjemahan.
- [ ] Perubahan harga saja tidak memicu terjemahan ulang.
- [ ] Gagal provider tidak membatalkan penyimpanan teks sumber dan dapat di-retry.
- [ ] Hasil request lama tidak menimpa revisi baru.
- [ ] Koreksi manual yang dikunci tidak ditimpa otomatis.
- [ ] Terjemahan lama ditandai perlu ditinjau dan publik memakai fallback yang aman.
- [ ] Tidak ada credential provider atau secret Supabase dalam bundle browser/log publik.

### Pemeriksaan teknis yang bermakna

- Unit test untuk resolver harga beserta batas waktu promo, format Won, kuantitas, dan URL encoding WhatsApp/LINE.
- Integration test RLS dengan anon, user biasa, dan admin; uji juga relasi anak serta izin Storage.
- Test concurrency terjemahan: revisi A selesai setelah revisi B dan tidak boleh menimpa B.
- E2E untuk tambah/edit produk, pergantian bahasa, dan alur pemilih kanal order.
- E2E tidak perlu mengirim pesan sungguhan; periksa link dan pesan yang dibentuk. Pemilik menguji link pada aplikasi chat aktual sebelum rilis.
- Jalankan lint, TypeScript check, test yang relevan, serta production build. Catat hasil aktual dan keterbatasan lingkungan secara jujur.

## 20. Deliverables developer

Serahkan repository dengan source aplikasi, migrations/policies Supabase, template environment tanpa rahasia, script seed demo terpisah, test inti, dan README.

README wajib menjelaskan instalasi lokal, versi runtime, menjalankan migrations, membuat admin pertama, pengaturan Storage, aktivasi Cloud Translation, konfigurasi WhatsApp/LINE, menjalankan test/build, deployment Node.js, serta cara admin mengisi produk dan mengoreksi terjemahan.

Aplikasi menggunakan server rendering, Auth, upload, dan terjemahan server; deployment harus menyediakan runtime Node.js yang sesuai. Jangan memilih static export murni untuk seluruh aplikasi ini. Jika deployment hanya demo tanpa Supabase/provider asli, laporkan bagian yang masih belum terhubung.

## 21. Referensi resmi implementasi

Dokumentasi diperiksa sebagai acuan spesifikasi pada 24 November 2026. Ikuti versi yang kompatibel dengan paket yang benar-benar diinstal.

- [Next.js — Installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase — Creating a client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage — Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [WhatsApp — How to use click to chat](https://faq.whatsapp.com/5913398998672934)
- [LINE Developers — LINE URL scheme](https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/)
- [Google Cloud Translation — Translate text](https://docs.cloud.google.com/translate/docs/translate-text)
- [Google Cloud Translation — Language support](https://docs.cloud.google.com/translate/docs/languages)

---

**Prioritas akhir:** katalog satu halaman yang menarik dan cepat, pengelolaan produk yang mudah, harga Won yang konsisten, terjemahan tiga bahasa yang dapat dikoreksi, serta pemesanan WhatsApp/LINE yang jelas.
