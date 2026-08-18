# ============================================================
# Panduan Deploy app-trainer ke VPS Biznet + Cloudflare
# Target: instructor.fiqry.com
# Stack: Next.js + PM2 + Nginx + Cloudflare
# ============================================================

## LANGKAH 1 — Siapkan VPS (jalankan sebagai root atau sudo)

# Update sistem
apt update && apt upgrade -y

# Install Node.js 20 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verifikasi
node -v   # harus v20.x
npm -v    # harus v10.x

# Install PM2 (process manager agar app terus berjalan)
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git


## LANGKAH 2 — Upload kode ke VPS

# Di VPS, clone dari GitHub (atau upload manual via scp)
cd /var/www
git clone https://github.com/USERNAME/app-trainer.git instructor
cd instructor

# Buat file .env.local di VPS (JANGAN taruh di GitHub)
nano .env.local
# Isi dengan:
# NEXT_PUBLIC_SUPABASE_URL=https://fvacuuktfulduonmtkri.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
# DATABASE_URL=postgresql://postgres.fvacuuktfulduonmtkri:Fmanunggal%232026@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
# DIRECT_URL=postgresql://postgres.fvacuuktfulduonmtkri:Fmanunggal%232026@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
# SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
# GEMINI_API_KEY=AIzaSy...

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build production bundle
npm run build


## LANGKAH 3 — Jalankan dengan PM2

# Start app di port 3001 (agar tidak bentrok dengan app lain)
PORT=3001 pm2 start npm --name "app-trainer" -- start

# Simpan PM2 config agar auto-restart saat VPS reboot
pm2 save
pm2 startup   # jalankan perintah yang muncul


## LANGKAH 4 — Konfigurasi Nginx

# Buat config Nginx untuk subdomain instructor.fiqry.com
nano /etc/nginx/sites-available/instructor.fiqry.com

# ── Isi file Nginx ──────────────────────────────────────────
server {
    listen 80;
    server_name instructor.fiqry.com;

    # Max upload size untuk CV PDF
    client_max_body_size 20M;

    location / {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;   # penting! AI extract butuh waktu lama
        proxy_send_timeout 300s;
    }
}
# ───────────────────────────────────────────────────────────

# Aktifkan config
ln -s /etc/nginx/sites-available/instructor.fiqry.com /etc/nginx/sites-enabled/
nginx -t          # test config (harus "syntax is ok")
systemctl reload nginx


## LANGKAH 5 — Konfigurasi Cloudflare DNS

# Di dashboard Cloudflare → fiqry.com → DNS → Add record:
# Type : A
# Name : instructor
# IPv4 : [IP VPS Biznet Anda]
# Proxy : ✅ Proxied (orange cloud) ← aktifkan agar dapat SSL gratis

# Cloudflare otomatis handle SSL — tidak perlu install certbot!


## LANGKAH 6 — Setting Cloudflare SSL/TLS

# Di Cloudflare → SSL/TLS → Overview
# Pilih mode: "Full" (bukan Full Strict, karena Nginx kita HTTP saja di VPS)


## ── Selesai! ─────────────────────────────────────────────
# https://instructor.fiqry.com  ← sudah bisa diakses

## ── Commands berguna ────────────────────────────────────────
# Cek status app:
pm2 status
pm2 logs app-trainer

# Restart app setelah update kode:
cd /var/www/instructor
git pull
npm install
npm run build
pm2 restart app-trainer

# Cek Nginx error:
tail -f /var/log/nginx/error.log
