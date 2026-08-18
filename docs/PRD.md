# PRD — FJM Instructor Database (app-trainer)

**Document version:** 1.0
**Date:** 18 Agustus 2026
**Owner:** PT Fiqry Jaya Manunggal (FJM) — Training & Consulting
**Status:** MVP Implemented (alpha)

---

## 1. Product Requirements Document (PRD)

### 1.1 Latar Belakang
FJM adalah training provider sektor energi (migas, geothermal, pembangkit, petrokimia, mining) sejak 2001. FJM memiliki database CV instruktur (100+ instruktur) dalam format PDF yang tersebar. Saat klien meminta training tertentu, mencari instruktur yang tepat secara manual lambat dan tidak terukur.

### 1.2 Tujuan Produk
Membangun aplikasi untuk mengelola database instruktur FJM sehingga:
- CV instruktur terpusat & terstruktur
- Admin dapat mengupload CV PDF → AI mengekstrak data → review → simpan
- Saat ada permintaan training, sistem merekomendasikan instruktur terbaik (AI ranking) berdasarkan kecocokan kompetensi

### 1.3 User & Peran
| Role | Akses |
|------|-------|
| Admin | Full (upload, extract, review, edit, delete, match) |

> Catatan: MVP hanya role Admin. Role SALES/MANAGEMENT dapat ditambah nanti (readonly + bisa request match).

### 1.4 Fitur Inti (MVP)
1. **Upload & Extract CV (AI-Assist)**
   - Upload PDF → Gemini mengekstrak → JSON draft (nama, email, pengalaman, kompetensi, sertifikasi, ringkasan)
   - Admin review/edit sebelum simpan (AI tidak full-auto)
2. **Manajemen Instruktur**
   - List instruktur (filter by kompetensi, keyword)
   - Detail instruktur (CV viewer + field terstruktur + edit)
3. **Master Kompetensi** — auto-terisi dari hasil ekstraksi
4. **AI Matching / Ranking**
   - Input topik training + deskripsi klien
   - Sistem mengembalikan instruktur ter-rank berdasarkan similarity (cosine) embedding
   - Menampilkan skor % + alasan (kompetensi cocok)
5. **Dashboard** — statistik (total instruktur, kompetensi terdaftar)

### 1.5 Non-Goals (di luar MVP)
- Multi-gudang / logistik
- Invoicing / finance
- Scheduling / penugasan instruktur ke jadwal
- Authentication penuh (login/session) — saat ini asumsi internal

### 1.6 Success Metrics
- Waktu cari instruktur untuk training baru: dari ~15 menit manual → < 1 menit
- 100% CV terdigitalisasi & searchable dalam 3 bulan
- Akurasi AI extract ≥ 85% (butuh human review)

### 1.7 Asumsi & Constraint
- Database: shared Supabase (project `clm-app`) — TIDAK boleh drop tabel lain
- Quota Supabase gratis: maks 2 project → app-trainer reuse DB clm-app
- 100+ instruktur → in-memory similarity cukup (tanpa pgvector)
- Bahasa UI: Indonesia

---

## 2. Tech Stack & Arsitektur

### 2.1 Stack
| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 / React 19 |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui-style (manual) + lucide-react icons |
| State/Data | TanStack Query (server state) + zustand (UI state) |
| AI | Google Gemini API (`gemini-2.0-flash` extract, `text-embedding-004` embedding) |
| Storage | Supabase Storage (bucket `cv-instructors`, public) |
| Hosting (rencana) | Vercel / Node server |

### 2.2 Arsitektur Sistem
```
[Browser]
   │  Upload PDF / Input Training
   ▼
[Next.js Route Handlers /api/*]
   ├─ /api/instructors/extract  → Gemini extract → Supabase Storage
   ├─ /api/instructors          → Prisma (DB)
   ├─ /api/match                → Gemini embed → cosine ranking
   ▼
[Prisma Client] → [PostgreSQL / Supabase]
[Supabase Storage] ← CV PDF
[Gemini API] ← extract + embedding
```

### 2.3 AI Pipeline
1. **Extract:** PDF base64 → `gemini-2.0-flash:generateContent` (responseMimeType JSON) → structured object
2. **Embedding:** gabungan `summary + competencies + certifications + experience` → `text-embedding-004` → 768-dim vector → disimpan sebagai **TEXT (JSON string)** di kolom `embedding`
3. **Match:** deskripsi training → embedding → cosine similarity dengan semua instruktur → filter score > 0.3 → sort → top N

### 2.4 Database Schema (Prisma)
- `Instructor` (id, name, email, phone, summary, years_exp, location, availability, cv_file_url, cv_raw_text, embedding TEXT, timestamps)
- `Competency` (id, name unique, category)
- `InstructorCompetency` (instructor_id, competency_id, level) — many-to-many
- `InstructorCertification` (id, instructor_id, name, issuer, year, valid_until)
- `TrainingRequest` (id, topic, description, embedding TEXT)
- `MatchResult` (id, request_id, instructor_id, score, reason)

> Embedding disimpan sebagai **TEXT (JSON array)** bukan `vector` → tidak butuh extension `vector`, aman di shared DB.

### 2.5 Deployment & Env
- `.env.local` wajib: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- DB schema di-deploy via **`supabase/schema.sql`** (CREATE TABLE IF NOT EXISTS) — **TIDAK** pakai `prisma db push` (cegah drop tabel CLM)
- Prisma client: `npx prisma generate` (tanpa migrate)

### 2.6 Keamanan
- Password DB di env di-encode (`#` → `%23`)
- Service role key hanya di server (never client)
- RLS: dinonaktifkan untuk tabel trainer (internal app) — atau bisa diaktifkan dengan policy service_role
- CV di Supabase Storage (public bucket) — pertimbangkan private + signed URL untuk produksi

---

## 3. UI/UX Specification

### 3.1 Prinsip Desain
- Clean, minimal, fokus pada tabel & form
- Bahasa Indonesia
- Responsive (desktop-first, karena admin pakai PC)
- Feedback jelas (loading state saat AI proses)

### 3.2 Struktur Halaman
| Route | Judul | Komponen Utama |
|-------|-------|----------------|
| `/` | Dashboard | 3 kartu statistik (total instruktur, kompetensi, quick action) |
| `/instructors` | Database Instruktur | Upload box, Review-draft modal, Tabel list |
| `/match` | Cari Instruktur (AI) | Form topik/deskripsi, Hasil ranking kartu |

### 3.3 Flow: Upload & Extract
```
[Upload PDF] → loading "Memproses AI…"
   → Modal Review (field editable: nama, email, telepon, pengalaman, lokasi, ketersediaan, ringkasan, kompetensi [comma], sertifikasi [comma])
   → [Simpan Instruktur] → list update
```

### 3.4 Flow: AI Match
```
[Input Topik] + [Deskripsi Kebutuhan]
   → loading "Mencari…"
   → Kartu hasil: #1 Nama (Skor X%), ringkasan, badge kompetensi, sertifikat, ketersediaan
```

### 3.5 Komponen UI
- **Button** (primary blue, success green, outline)
- **Card** (shadow, rounded)
- **Table** (header sticky, row hover)
- **Input/Select/Textarea** (border rounded)
- **Badge** (kompetensi, status)
- **Modal/Draft panel** (review extract)

### 3.6 State Management
- TanStack Query: fetch list, mutate save, match
- Local state: form draft, file selection, loading

---

## 4. Framework & Konvensi

### 4.1 Next.js 16 Notes (Breaking Changes)
- File dengan `useState`/`useEffect`/`useQuery` → wajib `"use client"` di baris paling atas
- `metadata` export **hanya di Server Component** → pisahkan `layout.tsx` (server, export metadata) dari `providers.tsx` (client, QueryClientProvider)
- App Router: `app/page.tsx`, `app/instructors/page.tsx`, `app/match/page.tsx`
- Route handlers: `app/api/.../route.ts` (export `GET`/`POST`)

### 4.2 Code Structure
```
app-trainer/
├── prisma/schema.prisma
├── supabase/schema.sql          # additive-only DB setup
├── src/
│   ├── app/
│   │   ├── layout.tsx           # server, metadata
│   │   ├── providers.tsx        # client, QueryClient
│   │   ├── page.tsx             # dashboard (client)
│   │   ├── globals.css
│   │   ├── instructors/page.tsx # upload + list
│   │   ├── match/page.tsx       # AI ranking
│   │   └── api/
│   │       ├── instructors/route.ts
│   │       ├── instructors/extract/route.ts
│   │       └── match/route.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── supabase.ts
│   │   └── gemini.ts            # extract + embed + cosine
├── .env.example
├── package.json
└── README.md
```

### 4.3 Konvensi
- Import alias: `@/*` → `./src/*`
- API response: `{ data }` atau `{ error }` dengan status code
- Error handling: try/catch + `console.error` + return 500 dengan pesan
- Naming: camelCase (TS), snake_case (DB columns)

### 4.4 Testing Checklist (MVP)
- [ ] Upload CV → extract → review → save → muncul di list
- [ ] Embedding tersimpan (kolom `embedding` tidak null)
- [ ] Filter list by kompetensi
- [ ] Match: input topik → hasil ranked dengan skor masuk akal
- [ ] Match: instruktur tanpa embedding → di-skip
- [ ] Storage: file CV accessible via URL

### 4.5 Roadmap (post-MVP)
1. Auth (login, role SALES/MANAGEMENT)
2. Edit/delete instruktur
3. Import CV dari Google Drive (akses read-only sudah ada)
4. PDF viewer inline di detail instruktur
5. Laporan ketersediaan instruktur per periode
6. Multi-language (EN) untuk klien internasional
7. Webhook/notifikasi saat instruktur cocok dengan RFQ training

---

## 5. Risiko & Mitigasi
| Risiko | Mitigasi |
|--------|----------|
| AI extract salah parse | Human review wajib sebelum save |
| Gemini rate limit (100+ CV) | Batch upload, queue, retry |
| Shared DB drop tabel CLM | Pakai `schema.sql` additive, jangan `db push` |
| Embedding model berubah | Version pin `text-embedding-004` |
| CV scan (gambar) | Gemini multimodal handle PDF scan |

---

*Dokumen dibuat otomatis oleh Hermes Agent — 18 Agustus 2026*
*Repo: https://github.com/fiqryjm/app-trainer*
