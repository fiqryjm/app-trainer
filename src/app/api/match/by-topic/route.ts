import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/match/by-topic — cari instruktur yang pernah mengajar topik serupa
export async function POST(request: Request) {
  try {
    const { topic } = await request.json();
    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 });
    }

    // Cari instruktur yang punya teaching_topics mengandung kata kunci
    // Pisah kata kunci untuk partial match yang lebih baik
    const keywords = topic.trim().split(/\s+/).filter((w: string) => w.length > 2);

    const instructors = await prisma.instructor.findMany({
      where: {
        teaching_topics: {
          some: {
            OR: keywords.map((kw: string) => ({
              topic: { contains: kw, mode: 'insensitive' },
            })),
          },
        },
      },
      include: {
        competencies: { include: { competency: true } },
        certifications: true,
        teaching_topics: true,
      },
      orderBy: { name: 'asc' },
    });

    // Hitung skor berdasarkan jumlah topik yang cocok
    const scored = instructors.map((ins) => {
      const matchedTopics = ins.teaching_topics.filter((t) =>
        keywords.some((kw: string) =>
          t.topic.toLowerCase().includes(kw.toLowerCase())
        )
      );
      return {
        id: ins.id,
        name: ins.name,
        summary: ins.summary,
        availability: ins.availability,
        years_exp: ins.years_exp,
        location: ins.location,
        competencies: ins.competencies.map((c) => c.competency.name),
        certifications: ins.certifications.map((c) => c.name),
        teaching_topics: ins.teaching_topics.map((t) => t.topic),
        matched_topics: matchedTopics.map((t) => t.topic),
        match_count: matchedTopics.length,
      };
    });

    // Urutkan: paling banyak topik cocok duluan
    scored.sort((a, b) => b.match_count - a.match_count);

    return NextResponse.json({ matches: scored });
  } catch (e: any) {
    console.error('POST /api/match/by-topic ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
