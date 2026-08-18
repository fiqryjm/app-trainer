# app-trainer — FJM Instructor Database

Aplikasi untuk mengelola database instruktur FJM (Training & Consulting).
Upload CV PDF → AI (Gemini) ekstrak data → simpan → cari instruktur terbaik
dengan AI ranking (semantic similarity) untuk permintaan training klien.

## Stack
- Next.js 16 + React 19 + Prisma 5 + PostgreSQL (Supabase)
- Tailwind 4 + shadcn-style components
- TanStack Query + zustand
- Gemini API (extract + embedding)
- Supabase Storage (file CV)

## Setup (SHARED Supabase DB - safe)
Jika memakai database Supabase yang sudah dipakai app lain (mis. CLM):
**JANGAN** pakai `prisma db push` (bisa menghapus tabel app lain).
Gunakan SQL manual yang AMAN (additive only):

1. Buka Supabase → SQL Editor
2. Copy isi `supabase/schema.sql` → Run
   (Hanya membuat tabel Instructor/Competency/... — tabel CLM tidak tersentuh)

3. Isi `.env` dengan credential project yang sama:
```bash
cp .env.example .env
# isi DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, keys, GEMINI_API_KEY
```

4. Generate Prisma client (tanpa migrate):
```bash
npx prisma generate
npm install
npm run dev
```

> Catatan: embedding disimpan sebagai TEXT (JSON array) — tidak butuh
> extension `vector`. Similarity dihitung in-memory (cosine), cukup untuk 100+.

## Fitur
- `/instructors` — upload CV, AI extract, review, simpan, list
- `/match` — ketik topik training → AI ranking instruktur (skor %)
- `/` — dashboard

Catatan: embedding disimpan sebagai `vector(768)` di kolom `Instructor.embedding`.
Untuk 100+ instruktur, similarity dihitung in-memory (cosine) — cukup cepat.
