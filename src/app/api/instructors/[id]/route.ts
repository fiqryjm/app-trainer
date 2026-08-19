import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { embedText, buildEmbedText } from '@/lib/gemini';

// GET /api/instructors/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const instructor = await prisma.instructor.findUnique({
      where: { id },
      include: {
        competencies: { include: { competency: true } },
        certifications: true,
        teaching_topics: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!instructor) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json(instructor);
  } catch (e: any) {
    console.error('GET /api/instructors/[id] ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/instructors/[id] — update instructor fields + optionally competencies & certifications
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name, email, phone, years_exp, location, availability, summary,
      competencies, certifications, teaching_topics,
    } = body;

    // Basic field update
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (years_exp !== undefined) updateData.years_exp = years_exp ? Number(years_exp) : null;
    if (location !== undefined) updateData.location = location || null;
    if (availability !== undefined) updateData.availability = availability || null;
    if (summary !== undefined) updateData.summary = summary || null;

    // Update competencies if provided
    if (Array.isArray(competencies)) {
      // Remove old competency links for this instructor
      await prisma.instructorCompetency.deleteMany({ where: { instructor_id: id } });

      // Upsert competencies and create new links
      for (const c of competencies) {
        const cname = typeof c === 'string' ? c.trim() : (c.name ?? '').trim();
        const level = typeof c === 'string' ? null : (c.level ?? null);
        if (!cname) continue;
        const comp = await prisma.competency.upsert({
          where: { name: cname },
          update: {},
          create: { name: cname },
        });
        await prisma.instructorCompetency.upsert({
          where: { instructor_id_competency_id: { instructor_id: id, competency_id: comp.id } },
          update: { level },
          create: { instructor_id: id, competency_id: comp.id, level },
        });
      }
    }

    // Update certifications if provided
    if (Array.isArray(certifications)) {
      // Remove old certifications
      await prisma.instructorCertification.deleteMany({ where: { instructor_id: id } });

      // Create new certifications
      for (const c of certifications) {
        const cname = typeof c === 'string' ? c.trim() : (c.name ?? '').trim();
        if (!cname) continue;
        await prisma.instructorCertification.create({
          data: {
            instructor_id: id,
            name: cname,
            issuer: typeof c === 'object' ? (c.issuer ?? null) : null,
            year: typeof c === 'object' && c.year ? Number(c.year) : null,
          },
        });
      }
    }

    // Update teaching topics if provided
    if (Array.isArray(teaching_topics)) {
      await prisma.teachingTopic.deleteMany({ where: { instructor_id: id } });
      for (const t of teaching_topics) {
        const topic = typeof t === 'string' ? t.trim() : '';
        if (!topic) continue;
        await prisma.teachingTopic.create({ data: { instructor_id: id, topic } });
      }
    }

    // Re-generate embedding jika ada perubahan data substantif
    const shouldReEmbed = Array.isArray(competencies) || Array.isArray(certifications) || Array.isArray(teaching_topics) || summary !== undefined;
    if (shouldReEmbed) {
      try {
        // Fetch data terbaru untuk membangun embedding
        const latest = await prisma.instructor.findUnique({
          where: { id },
          include: {
            competencies: { include: { competency: true } },
            certifications: true,
            teaching_topics: true,
          },
        });
        if (latest) {
          const embText = buildEmbedText({
            summary: updateData.summary ?? latest.summary ?? undefined,
            competencies: (latest.competencies || []).map((c) => c.competency.name),
            certifications: (latest.certifications || []).map((c) => ({ name: c.name })),
            teaching_topics: (latest.teaching_topics || []).map((t) => t.topic),
          });
          const newEmbedding = await embedText(embText);
          updateData.embedding = JSON.stringify(newEmbedding);
        }
      } catch (e) {
        console.error('Re-embed error (non-fatal):', e);
      }
    }

    const updated = await prisma.instructor.update({
      where: { id },
      data: updateData,
      include: {
        competencies: { include: { competency: true } },
        certifications: true,
        teaching_topics: { orderBy: { created_at: 'asc' } },
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error('PATCH /api/instructors/[id] ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/instructors/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.instructor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/instructors/[id] ERROR:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
