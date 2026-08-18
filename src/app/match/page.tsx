"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

export default function MatchPage() {
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const matchMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, description }),
      });
      return r.json();
    },
    onSuccess: (data) => setResults(data.matches || []),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Cari Instruktur (AI Ranking)</h1>
      <div className="bg-white rounded shadow p-4 mb-6">
        <label className="block text-sm font-medium mb-1">Topik Training</label>
        <input className="border rounded p-2 w-full mb-3" placeholder="mis: Pelatihan Instrumentation Migas" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <label className="block text-sm font-medium mb-1">Deskripsi / Kebutuhan Klien</label>
        <textarea className="border rounded p-2 w-full mb-3" rows={4} placeholder="Jelaskan kompetensi diharapkan, sertifikat, pengalaman minimal…" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button
          onClick={() => matchMut.mutate()}
          disabled={!topic || matchMut.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {matchMut.isPending ? "Mencari…" : "Cari Instruktur Terbaik"}
        </button>
      </div>

      <div className="space-y-3">
        {results.map((m, idx) => (
          <div key={m.id} className="bg-white rounded shadow p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">#{idx + 1} {m.name}</h3>
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">Skor: {(m.score * 100).toFixed(0)}%</span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{m.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {m.competencies.map((c: string) => (
                <span key={c} className="text-xs bg-slate-100 px-2 py-0.5 rounded">{c}</span>
              ))}
            </div>
            <div className="mt-1 text-xs text-slate-500">Sertifikat: {m.certifications.join(", ") || "-"} | {m.availability || "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
