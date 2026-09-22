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

  const prompt = `Extract structured information from this CV. Return ONLY a JSON object matching this schema:
{
  "name": string,
  "email": string|null,
  "phone": string|null,
  "years_exp": number|null,
  "location": string|null,
  "availability": string|null,  // "Available" / "Booked" / "Part-time" / null
  "summary": string,  // 2-3 sentences profile summary in the CV's original language (DO NOT translate)
  "competencies": string[],  // concise technical skills/competencies in the CV's original language. If CV is in English, write in English (e.g. ["Geothermal Exploration", "Well Testing", "Geochemistry", "Reservoir Engineering"]). NEVER TRANSLATE TO INDONESIAN!
  "certifications": [{"name": string, "issuer": string|null, "year": number|null}],  // exact certification and issuer names as written in CV (DO NOT translate)
  "experience_highlights": string[],  // 3-5 key career highlights in the CV's original language (DO NOT translate)
  "teaching_topics": string[]  // course/class/training titles taught as an instructor/trainer verbatim as written in the CV (DO NOT translate). Empty array if none.
}

CRITICAL RULES:
1. STRICT ZERO-TRANSLATION POLICY: Do NOT translate between English and Indonesian.
   - If the CV is in English, all extracted items (competencies, topics, certifications, summary) MUST REMAIN IN ENGLISH.
   - For example: write "Geothermal Exploration & Development" NOT "Eksplorasi & Pengembangan Panas Bumi", "Well Testing" NOT "Uji Sumur", "Corrosion & Scaling" NOT "Pengerakan & Korosi", "Project Management" NOT "Manajemen Proyek".
   - If the CV is in Indonesian, keep it in Indonesian.
2. If unsure, use null. Ensure the JSON is valid.`;

  const body = {
    systemInstruction: {
      parts: [
        {
          text: `You are an expert CV and resume extraction engine for an energy & engineering training company (FJM).
Your primary mandate is accurate extraction without language transformation.

ABSOLUTE LANGUAGE PRESERVATION DIRECTIVE:
- Identify the language of the source CV.
- Extract all fields strictly in their ORIGINAL LANGUAGE.
- NEVER TRANSLATE text from English to Indonesian or vice-versa.
- Technical competencies, certification titles, issuing bodies, course syllabus topics, and summaries must preserve the phrasing and language used in the CV document.`,
        },
      ],
    },
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
