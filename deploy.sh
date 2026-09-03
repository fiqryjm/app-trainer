#!/bin/bash

# ============================================================
#  DEPLOY SCRIPT — app-trainer
#  Jalankan di VPS: bash deploy.sh
# ============================================================

set -e  # stop jika ada error

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="app-trainer"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       🚀  DEPLOY  app-trainer            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Cek .env.local ───────────────────────────────────────
echo "▶ [1/6] Mengecek .env.local..."
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
  echo ""
  echo "❌  File .env.local tidak ditemukan!"
  echo "    Buat dulu dengan perintah:"
  echo ""
  echo "    nano $PROJECT_DIR/.env.local"
  echo ""
  echo "    Isi dengan:"
  echo "      NEXT_PUBLIC_SUPABASE_URL=..."
  echo "      NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
  echo "      DATABASE_URL=..."
  echo "      DIRECT_URL=..."
  echo "      SUPABASE_SERVICE_ROLE_KEY=..."
  echo "      GEMINI_API_KEY=..."
  echo ""
  exit 1
fi
echo "   ✓ .env.local ditemukan"

# ── 2. Git Pull ──────────────────────────────────────────────
echo ""
echo "▶ [2/6] Git pull..."
cd "$PROJECT_DIR"
git pull origin main
echo "   ✓ Kode terbaru"

# ── 3. Install dependencies ──────────────────────────────────
echo ""
echo "▶ [3/6] npm install..."
npm install --legacy-peer-deps
echo "   ✓ Dependencies terinstall"

# ── 4. Prisma generate ───────────────────────────────────────
echo ""
echo "▶ [4/6] Prisma generate..."
npx prisma generate
echo "   ✓ Prisma client siap"

# ── 5. Build ─────────────────────────────────────────────────
echo ""
echo "▶ [5/6] Build production..."
npm run build
echo "   ✓ Build sukses"

# ── 6. Restart / Start via PM2 ───────────────────────────────
echo ""
echo "▶ [6/6] Restart server dengan PM2..."

if command -v pm2 &> /dev/null; then
  # Cek apakah app sudah terdaftar di PM2
  if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart "$APP_NAME"
    echo "   ✓ PM2 app '$APP_NAME' di-restart"
  else
    pm2 start npm --name "$APP_NAME" -- start
    pm2 save
    echo "   ✓ PM2 app '$APP_NAME' didaftarkan & dijalankan"
  fi
else
  echo ""
  echo "⚠  PM2 tidak ditemukan. Install dulu:"
  echo "   npm install -g pm2"
  echo ""
  echo "   Atau jalankan manual (tidak persistent):"
  echo "   npm run start"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅  DEPLOY SELESAI!                    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
pm2 list 2>/dev/null || true
