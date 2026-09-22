const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const EMBED_MODEL = 'gemini-embedding-2';
const EXTRACT_MODEL = 'gemini-2.5-flash';

// Extract structured data from a CV (PDF passed as base64 data URL)
// Returns parsed JSON matching Instructor shape
export async function extractCvWithGemini(
  pdfBase64: string,
  mimeType = 'application/pdf'
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EXTRACT_MODEL}:generateContent?key=${GEMINI_KEY}`;

  const prompt = `Anda adalah ekstraktor CV profesional untuk perusahaan training (FJM) yang fokus sektor energi (migas, geothermal, pembangkit, petrokimia, mining). 
Ekstrak informasi berikut dari CV ini dan KEMBALIKAN HANYA JSON (tanpa markdown, tanpa teks lain):
{
  "name": string,
  "email": string|null,
  "phone": string|null,
  "years_exp": number|null,
  "location": string|null,
  "availability": string|null,  // "Available" / "Booked" / "Part-time" / null
  "summary": string,  // ringkasan 2-3 kalimat keahlian instruktur (sesuaikan dengan bahasa dominan di CV)
  "competencies": string[],  // bidang keahlian/spesialisasi teknis (PERTAHANKAN bahasa asli di CV, JANGAN diterjemahkan/auto-translate. Contoh: jika CV bahasa Inggris gunakan istilah seperti "Process Safety Management", "Corrosion Engineering", bukan diterjemahkan)
  "certifications": [{"name": string, "issuer": string|null, "year": number|null}],  // nama sertifikasi dan issuer ASLI persis seperti tertulis di CV (JANGAN diterjemahkan)
  "experience_highlights": string[],  // 3-5 poin pengalaman relevan (pertahankan bahasa asli dokumen CV)
  "teaching_topics": string[]  // judul-judul training/kelas/mata diklat yang pernah DIBAWAKAN sebagai instruktur/trainer (tulis persis sesuai nama topik/judul di CV, JANGAN diterjemahkan). Kosongkan array jika tidak ada riwayat mengajar.
}
ATURAN PENTING BAHASA:
- JANGAN auto-translate istilah teknis, sertifikasi, kompetensi, nama instansi/issuer, atau topik pelatihan ke Bahasa Indonesia jika dokumen aslinya berbahasa Inggris. Gunakan bahasa asli yang tertera pada CV.
- Jika tidak yakin, gunakan null. Pastikan JSON valid.`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: pdfBase64 } },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error('Gemini extract HTTP error', res.status, errBody);
    throw new Error('Gemini extract failed: ' + res.status + ' | ' + errBody);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// Generate embedding vector (768-dim) from combined text
export async function embedText(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_KEY}`;
  const body = {
    content: { parts: [{ text }] },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Gemini embed failed: ' + res.status);
  const data = await res.json();
  return data?.embedding?.values ?? [];
}

// Build embedding text from instructor record
export function buildEmbedText(d: {
  summary?: string | null;
  competencies?: string[];
  certifications?: { name: string }[];
  experience_highlights?: string[];
  teaching_topics?: string[];
}): string {
  const parts = [
    d.summary ?? '',
    (d.competencies ?? []).join(', '),
    (d.certifications ?? []).map((c) => c.name).join(', '),
    (d.experience_highlights ?? []).join(' '),
    (d.teaching_topics ?? []).join(' | '),
  ];
  return parts.filter(Boolean).join(' | ');
}

// Cosine similarity
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Parse embedding stored as JSON string
export function safeParse(emb: any): number[] {
  if (!emb) return [];
  if (Array.isArray(emb)) return emb;
  try { return JSON.parse(emb); } catch { return []; }
}
