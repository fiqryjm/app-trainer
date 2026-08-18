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

## Setup
```bash
cp .env.example .env   # isi DATABASE_URL, SUPABASE_*, GEMINI_API_KEY
npm install
npx prisma db push
npm run dev
```

## Fitur
- `/instructors` — upload CV, AI extract, review, simpan, list
- `/match` — ketik topik training → AI ranking instruktur (skor %)
- `/` — dashboard

Catatan: embedding disimpan sebagai `vector(768)` di kolom `Instructor.embedding`.
Untuk 100+ instruktur, similarity dihitung in-memory (cosine) — cukup cepat.
