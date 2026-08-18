-- ============================================================
-- app-trainer schema (ADDITIVE ONLY - safe to run on shared DB)
-- This script ONLY creates trainer tables. It does NOT touch
-- any existing CLM tables. Run in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS "Instructor" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          TEXT NOT NULL,
  "email"         TEXT UNIQUE,
  "phone"         TEXT,
  "photo_url"     TEXT,
  "summary"       TEXT,
  "years_exp"     INTEGER,
  "location"      TEXT,
  "availability"  TEXT,
  "cv_raw_text"   TEXT,
  "cv_file_url"   TEXT,
  "embedding"     TEXT,   -- JSON array of floats (768-dim)
  "created_at"    TIMESTAMP DEFAULT now(),
  "updated_at"    TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Competency" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"      TEXT UNIQUE NOT NULL,
  "category"  TEXT
);

CREATE TABLE IF NOT EXISTS "InstructorCompetency" (
  "instructor_id" UUID NOT NULL REFERENCES "Instructor"("id") ON DELETE CASCADE,
  "competency_id" UUID NOT NULL REFERENCES "Competency"("id") ON DELETE CASCADE,
  "level"         TEXT,
  PRIMARY KEY ("instructor_id", "competency_id")
);

CREATE TABLE IF NOT EXISTS "InstructorCertification" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "instructor_id" UUID NOT NULL REFERENCES "Instructor"("id") ON DELETE CASCADE,
  "name"          TEXT NOT NULL,
  "issuer"        TEXT,
  "year"          INTEGER,
  "valid_until"   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TrainingRequest" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "topic"       TEXT NOT NULL,
  "description" TEXT,
  "embedding"   TEXT,
  "created_at"  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "MatchResult" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id"    UUID NOT NULL REFERENCES "TrainingRequest"("id") ON DELETE CASCADE,
  "instructor_id" UUID NOT NULL REFERENCES "Instructor"("id") ON DELETE CASCADE,
  "score"         DOUBLE PRECISION,
  "reason"        TEXT
);

-- Optional index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_instructor_name" ON "Instructor"("name");
CREATE INDEX IF NOT EXISTS "idx_competency_name" ON "Competency"("name");
