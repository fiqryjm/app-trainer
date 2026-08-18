"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";

async function fetchInstructors() {
  const r = await fetch("/api/instructors");
  return r.json();
}

export default function InstructorsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState<any | null>(null);
  const [cvUrl, setCvUrl] = useState<string>("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["instructors"],
    queryFn: fetchInstructors,
  });
  const list = Array.isArray(data) ? data : [];

  const doExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setDraft(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/instructors/extract", { method: "POST", body: fd });
    const res = await r.json();
    setExtracting(false);
    if (res.extracted) {
      setDraft({ ...res.extracted, experience_highlights: res.extracted.experience_highlights || [], certifications: res.extracted.certifications || [] });
      setCvUrl(res.cv_file_url || "");
    } else {
      alert("Gagal extract: " + (res.error || "unknown"));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, cv_file_url: cvUrl }),
      });
      return r.json();
    },
    onSuccess: () => {
      setDraft(null); setFile(null); setCvUrl("");
      refetch();
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Database Instruktur</h1>

      {/* Upload */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-semibold mb-2">Upload CV (PDF)</h2>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button
          onClick={doExtract}
          disabled={!file || extracting}
          className="ml-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {extracting ? "Memproses AI…" : "Ekstrak dengan AI"}
        </button>
      </div>

      {/* Review draft */}
      {draft && (
        <div className="bg-yellow-50 border rounded shadow p-4 mb-6">
          <h2 className="font-semibold mb-3">Review Hasil Ekstraksi (edit bila perlu)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nama" value={draft.name ?? ""} onChange={(v) => setDraft({ ...draft, name: v })} />
            <Field label="Email" value={draft.email ?? ""} onChange={(v) => setDraft({ ...draft, email: v })} />
            <Field label="Telepon" value={draft.phone ?? ""} onChange={(v) => setDraft({ ...draft, phone: v })} />
            <Field label="Pengalaman (tahun)" value={draft.years_exp ?? ""} onChange={(v) => setDraft({ ...draft, years_exp: v })} />
            <Field label="Lokasi" value={draft.location ?? ""} onChange={(v) => setDraft({ ...draft, location: v })} />
            <Field label="Ketersediaan" value={draft.availability ?? ""} onChange={(v) => setDraft({ ...draft, availability: v })} />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Ringkasan</label>
            <textarea className="border rounded p-2 w-full" rows={3} value={draft.summary ?? ""} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Kompetensi (pisahkan dengan koma)</label>
            <input className="border rounded p-2 w-full" value={(draft.competencies || []).join(", ")} onChange={(e) => setDraft({ ...draft, competencies: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Sertifikasi (nama, dipisah koma)</label>
            <input className="border rounded p-2 w-full" value={(draft.certifications || []).map((c: any) => c.name).join(", ")} onChange={(e) => setDraft({ ...draft, certifications: e.target.value.split(",").map((s: string) => ({ name: s.trim() })).filter((c: any) => c.name) })} />
          </div>
          <button
            onClick={() => saveMutation.mutate(draft)}
            disabled={saveMutation.isPending}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saveMutation.isPending ? "Menyimpan…" : "Simpan Instruktur"}
          </button>
          <button onClick={() => setDraft(null)} className="mt-4 ml-3 px-4 py-2 rounded border">Batal</button>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">Daftar Instruktur ({list.length})</h2>
        {isLoading ? <p>Memuat…</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Nama</th>
                <th>Kompetensi</th>
                <th>Sertifikasi</th>
                <th>Pengalaman</th>
                <th>Ketersediaan</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i: any) => (
                <tr key={i.id} className="border-b">
                  <td className="py-2 font-medium">{i.name}</td>
                  <td>{(i.competencies || []).map((c: any) => c.competency.name).join(", ")}</td>
                  <td>{(i.certifications || []).map((c: any) => c.name).join(", ")}</td>
                  <td>{i.years_exp ? i.years_exp + " thn" : "-"}</td>
                  <td>{i.availability || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input className="border rounded p-2 w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
