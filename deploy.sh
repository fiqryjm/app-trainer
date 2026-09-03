#!/bin/bash

# ============================================================
#  DEPLOY SCRIPT — app-trainer
#  VPS path : /var/www/instructor
#  Jalankan : bash /var/www/instructor/deploy.sh
# ============================================================

set -e

PROJECT_DIR="/var/www/instructor"
APP_NAME="app-trainer"
BRANCH="master"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       🚀  DEPLOY  app-trainer            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Cek .env.local ───────────────────────────────────────
echo "▶ [1/5] Mengecek .env.local..."
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
  echo "❌  File .env.local tidak ditemukan di $PROJECT_DIR!"
  exit 1
fi
echo "   ✓ .env.local ditemukan"

# ── 2. Git — force sync dengan origin/master ─────────────────
echo ""
echo "▶ [2/5] Sync kode dari GitHub (branch: $BRANCH)..."
cd "$PROJECT_DIR"
git fetch origin
git reset --hard origin/$BRANCH
echo "   ✓ Kode terbaru dari origin/$BRANCH"

# ── 3. Install dependencies ──────────────────────────────────
echo ""
echo "▶ [3/5] npm install..."
npm install --legacy-peer-deps
echo "   ✓ Dependencies terinstall"

# ── 4. Build production ──────────────────────────────────────
echo ""
echo "▶ [4/5] Build production..."
npm run build
echo "   ✓ Build sukses"

# ── 5. Reload PM2 ────────────────────────────────────────────
echo ""
echo "▶ [5/5] Reload PM2 ($APP_NAME)..."
pm2 reload "$APP_NAME"
echo "   ✓ PM2 reloaded"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅  DEPLOY SELESAI!                    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
pm2 list
