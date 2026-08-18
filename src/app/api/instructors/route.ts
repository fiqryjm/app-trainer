import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { embedText, buildEmbedText } from '@/lib/gemini';

// GET list instructors (with filters)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const competency = searchParams.get('competency');
    const q = searchParams.get('q');

    let where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (competency) {
      where.competencies = { some: { competency: { name: { equals: competency } } } };
    }

    const instructors = await prisma.instructor.findMany({
      where,
      include: {
        competencies: { include: { competency: true } },
        certifications: true,
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    return NextResponse.json(instructors);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: save instructor from reviewed JSON + generate embedding
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, years_exp, location, availability, summary,
            competencies, certifications, experience_highlights, cv_file_url, cv_raw_text } = body;

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    // upsert competencies
    const compConnect = [];
    for (const c of competencies || []) {
      const name2 = typeof c === 'string' ? c : c.name;
      const lvl = typeof c === 'string' ? null : c.level;
      const comp = await prisma.competency.upsert({
        where: { name: name2 },
        update: {},
        create: { name: name2 },
      });
      compConnect.push({ competency: { connect: { id: comp.id } }, level: lvl });
    }

    // embedding
    const embText = buildEmbedText({ summary, competencies: (competencies||[]).map((c:any)=> typeof c==='string'?c:c.name), certifications, experience_highlights });
    let embedding: number[] | null = null;
    try { embedding = await embedText(embText); } catch (e) { console.error('embed err', e); }

    const instructor = await prisma.instructor.create({
      data: {
        name,
        email,
        phone,
        years_exp: years_exp ? Number(years_exp) : null,
        location,
        availability,
        summary,
        cv_file_url,
        cv_raw_text,
        embedding: embedding ? (embedding as any) : undefined,
        competencies: { create: compConnect },
        certifications: { create: (certifications || []).map((c: any) => ({
          name: c.name, issuer: c.issuer ?? null, year: c.year ?? null,
        })) },
      },
      include: { competencies: { include: { competency: true } }, certifications: true },
    });

    return NextResponse.json(instructor, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
