import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { embedText, cosine, safeParse } from '@/lib/gemini';

// POST /api/match -> rank instructors for a training request
export async function POST(request: Request) {
  try {
    const { topic, description, top = 5 } = await request.json();
    const text = `${topic}\n${description || ''}`;

    // embed the request
    const reqEmb = await embedText(text);

    // fetch all instructors with embeddings
    const instructors = await prisma.instructor.findMany({
      where: { embedding: { not: null } },
      include: {
        competencies: { include: { competency: true } },
        certifications: true,
      },
    });

    const scored = instructors
      .map((ins) => ({
        instructor: ins,
        score: cosine(reqEmb, safeParse(ins.embedding)),
      }))
      .filter((x) => x.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(top));

    // save request + results
    const req = await prisma.trainingRequest.create({
      data: {
        topic,
        description: description || null,
        embedding: JSON.stringify(reqEmb) as any,
        results: {
          create: scored.map((s) => ({
            instructor_id: s.instructor.id,
            score: s.score,
            reason: (s.instructor.competencies || [])
              .map((c) => c.competency.name)
              .slice(0, 5)
              .join(', '),
          })),
        },
      },
      include: { results: true },
    });

    return NextResponse.json({
      request_id: req.id,
      matches: scored.map((s) => ({
        id: s.instructor.id,
        name: s.instructor.name,
        summary: s.instructor.summary,
        score: s.score,
        competencies: (s.instructor.competencies || []).map((c) => c.competency.name),
        certifications: (s.instructor.certifications || []).map((c) => c.name),
        availability: s.instructor.availability,
      })),
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
