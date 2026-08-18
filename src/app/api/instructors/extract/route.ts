import { NextResponse } from 'next/server';
import { extractCvWithGemini } from '@/lib/gemini';
import { supabase, CV_BUCKET } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = Buffer.from(bytes).toString('base64');

    // upload to supabase storage
    const path = `${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from(CV_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (upErr) console.error('Upload err', upErr);

    const publicUrl =
      supabase.storage.from(CV_BUCKET).getPublicUrl(path).data.publicUrl;

    // extract with Gemini
    const extracted = await extractCvWithGemini(base64, file.type || 'application/pdf');

    return NextResponse.json({ extracted, cv_file_url: publicUrl });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'extract failed' }, { status: 500 });
  }
}
