# ZAIN AI LIVE RACING — Paket Upload Android (V1.2)

Tujuan: game balap web menerima perintah berdasarkan gift TikTok LIVE. Paket ini menaruh semua file di satu folder supaya lebih mudah diunggah dari Chrome Android ke GitHub. **JANGAN mengunggah ZIP mentah ke repo: ekstrak dahulu, upload file di dalamnya.**

## Persyaratan
- TikTok boleh LIVE dan opsi Game Seluler / Mobile Gaming tersedia.
- Punya akun GitHub dan Render.com.
- Server Node.js 20+.

## Cara menggunakan (satu server Render, tanpa GitHub Pages)
1. Di Android, ekstrak ZIP ini di Files / pengelola berkas. Hasilnya: `index.html`, `style.css`, `game.js`, `server.js`, `package.json`, `mapping.json` dan `README.md`.
2. Di github.com, login, buat repo baru `zain-ai-live-racing`, lalu gunakan **Add file -> Upload files**. Pilih SEMUA 7 file dari folder hasil ekstrak, bukan berkas ZIP. Pastikan berkas muncul di root repo, lalu Commit changes. Dari Chrome Android bisa aktifkan **Situs desktop** jika perlu.
3. Login di dashboard.render.com, pilih **New -> Web Service**, hubungkan GitHub, pilih repo `zain-ai-live-racing`.
4. Pilih runtime Node, Root Directory kosong, Build Command `npm install`, Start Command `npm start` dan instance Free untuk uji coba bila ditawarkan. Atur Environment Variables: key `TIKTOK_USERNAME`, value `username_tiktok_asli` (tanpa @). Masukkan sebelum membuat service atau lewat menu Environment lalu Save/Deploy.
5. Klik Create Web Service. Setelah selesai, buka URL `https://nama-server.onrender.com/`. Game otomatis mencoba WebSocket `wss://nama-server.onrender.com/events`.
6. Tes tombol gift simulasi. Pastikan game berjalan. Di URL `/health`, nilai `ok: true` berarti server hidup, `live: false` berarti gift belum terkoneksi ke akun yang LIVE.
7. Di TikTok ponsel, pilih LIVE -> Game Seluler -> bagikan layar -> mulai LIVE, lalu buka Chrome ke alamat Render game dan biarkan di depan layar. Saat TikTok sedang LIVE, tunggu status situs menjadi `TIKTOK LIVE TERHUBUNG`.
8. Uji gift asli dari penonton secara sukarela, atau dengan akun tester lain. Periksa Logs pada Render untuk `Gift: ... => forward/left/...`. Jika tertulis unmapped, ubah `mapping.json` dan commit kembali, lalu deploy ulang. Jangan gunakan koin hanya untuk mengetes banyak aksi: mode simulasi gratis telah disediakan.

### Map default
rose / mawar -> maju 2 detik; ice cream / es krim -> kiri; heart / hati -> kanan; chili / pepper -> mundur; rocket / tiktok -> nitro. Gift yang muncul di akun dapat berbeda nama, cek log LIVE dan sesuaikan `mapping.json`.

### Pemeriksaan bila gagal
- `Not live / LIVE belum terhubung`: LIVE belum dimulai, username salah atau konektor tidak bisa masuk ke event TikTok.
- `Gift unmapped`: belum ada nama / ID hadiah yang cocok di `mapping.json`.
- `Server terputus`: coba tunggu dan reload, cek Logs & status Deploy di Render.
- Browser tidak muncul saat LIVE: pastikan pilih Game Seluler / berbagi layar, bukan kamera.
- Browser terasa lambat: kurangi kualitas streaming dan matikan aplikasi lain.

### Batasan
`TikTok-Live-Connector` adalah pustaka *tidak resmi* dan dapat sewaktu-waktu gagal karena perubahan TikTok dan pembatasan signing. Tidak ada jaminan 100% uptime. Render Free juga bisa tertidur setelah idle 15 menit dan restart kapan saja; paket berbayar dengan server always-on lebih cocok untuk LIVE rutin. Jangan mengunggah cookie/password TikTok ke repo, screenshot maupun chat. Server ini menerima gift saat LIVE, bukan tanpa LIVE.
