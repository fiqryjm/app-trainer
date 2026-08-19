"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

export default function MatchPage() {
  const [topic, setTopic] = useState("");
  const [sector, setSector] = useState("");
  const [description, setDescription] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState<"ai" | "topic" | null>(null);
  const [searched, setSearched] = useState(false);

  const matchMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          description: [sector && `Sektor: ${sector}`, description].filter(Boolean).join('\n'),
        }),
      });
      return r.json();
    },
    onSuccess: (data) => {
      setResults(data.matches || []);
      setSearchMode("ai");
      setSearched(true);
    },
  });

  const byTopicMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/match/by-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      return r.json();
    },
    onSuccess: (data) => {
      setResults(data.matches || []);
      setSearchMode("topic");
      setSearched(true);
    },
  });

  const rankClass = (idx: number) => {
    if (idx === 0) return "match-rank match-rank-1";
    if (idx === 1) return "match-rank match-rank-2";
    if (idx === 2) return "match-rank match-rank-3";
    return "match-rank match-rank-n";
  };

  const scoreColor = (score: number) => {
    if (score >= 0.7) return "var(--success)";
    if (score >= 0.5) return "var(--brand)";
    return "var(--warning)";
  };

  const availColor = (a?: string) => {
    const v = a?.toLowerCase();
    if (v === "available") return "avail-available";
    if (v === "booked") return "avail-booked";
    return "avail-part";
  };

  return (
    <div style={{ animation: "fadeInUp .3s ease" }}>
      {/* Header */}
      <div className="page-header">
        <h1>🤖 Cari Instruktur (AI Ranking)</h1>
        <p>Masukkan topik training klien — AI akan merekomendasikan instruktur terbaik berdasarkan kecocokan kompetensi</p>
      </div>

      {/* Search Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>🔍 Deskripsi Kebutuhan Training</h2>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="field">
              <label className="field-label">Topik Training *</label>
              <input
                className="field-input"
                placeholder="mis: Electrical Protection and Grounding System"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && topic && !matchMut.isPending && matchMut.mutate()}
              />
            </div>
            <div className="field">
              <label className="field-label">Sektor / Industri</label>
              <input
                className="field-input"
                placeholder="mis: Geothermal, Migas, Petrokimia…"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label className="field-label">Deskripsi Tambahan / Kebutuhan Khusus</label>
            <textarea
              className="field-textarea"
              rows={3}
              placeholder="Jelaskan kompetensi yang diharapkan, sertifikasi yang diperlukan, pengalaman minimal, dsb…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => matchMut.mutate()}
              disabled={!topic || matchMut.isPending || byTopicMut.isPending}
              className="btn btn-primary"
              style={{ minWidth: 180 }}
            >
              {matchMut.isPending ? (
                <><span className="spinner" />Mencari instruktur…</>
              ) : (
                <>🤖 Cari Instruktur Terbaik</>
              )}
            </button>
            <button
              onClick={() => byTopicMut.mutate()}
              disabled={!topic || matchMut.isPending || byTopicMut.isPending}
              className="btn btn-outline"
              style={{ minWidth: 210 }}
            >
              {byTopicMut.isPending ? (
                <><span className="spinner" />Mencari…</>
              ) : (
                <>📋 Cari Berdasarkan Topik Mengajar</>
              )}
            </button>
            {searched && (
              <button
                onClick={() => { setResults([]); setSearched(false); setSearchMode(null); setTopic(""); setSector(""); setDescription(""); }}
                className="btn btn-outline"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* How it works (shown before search) */}
      {!searched && !matchMut.isPending && (
        <div className="card">
          <div className="card-body" style={{ padding: "36px 24px" }}>
            <div style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 8px" }}>Cara Kerja AI Matching</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 20 }}>
              {[
                { icon: "✏️", step: "1", title: "Masukkan Topik", desc: "Ketik topik training dan kebutuhan klien Anda" },
                { icon: "🧠", step: "2", title: "AI Embedding", desc: "Gemini mengubah teks menjadi vektor semantik" },
                { icon: "📐", step: "3", title: "Cosine Similarity", desc: "Membandingkan kecocokan dengan profil instruktur" },
                { icon: "🏆", step: "4", title: "Ranking Hasil", desc: "Instruktur terbaik ditampilkan dengan skor %" },
              ].map((s) => (
                <div key={s.step} style={{ textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, background: "rgba(99,102,241,.08)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>
                    {s.icon}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                    Step {s.step}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {matchMut.isPending && (
        <div className="card">
          <div className="empty-state">
            <div style={{ width: 36, height: 36, margin: "0 auto 16px" }}>
              <span className="spinner spinner-dark" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
            <h3 className="animate-pulse-subtle">AI sedang menganalisis kebutuhan training…</h3>
            <p>Membandingkan {topic} dengan semua profil instruktur di database</p>
          </div>
        </div>
      )}

      {searched && results.length === 0 && !matchMut.isPending && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">😔</div>
            <h3>Tidak ada instruktur cocok</h3>
            <p>Coba gunakan kata kunci yang berbeda, atau tambahkan lebih banyak instruktur ke database</p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, fontWeight: 500 }}>
            {searchMode === "topic" ? (
              <>📋 Ditemukan <strong>{results.length}</strong> instruktur yang pernah mengajar topik "<em>{topic}</em>"</>
            ) : (
              <>🏆 Ditemukan <strong>{results.length}</strong> instruktur untuk topik "<em>{topic}</em>"</>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {results.map((m, idx) => (
              <div key={m.id} className="match-card" style={{ animationDelay: `${idx * .08}s` }}>
                <div className="match-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className={rankClass(idx)}>#{idx + 1}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                      {m.availability && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <div className={`avail-dot ${availColor(m.availability)}`} />
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.availability}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="match-score">
                    <div style={{ textAlign: "right" }}>
                      {searchMode === "topic" ? (
                        <>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--success)", lineHeight: 1 }}>
                            {m.match_count}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Topik Cocok</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(m.score), lineHeight: 1 }}>
                            {(m.score * 100).toFixed(0)}%
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Skor Kecocokan</div>
                        </>
                      )}
                    </div>
                    {searchMode === "ai" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div className="score-bar">
                          <div className="score-fill" style={{ width: `${Math.min(m.score * 100, 100)}%`, background: `linear-gradient(90deg, ${scoreColor(m.score)}, ${scoreColor(m.score)}aa)` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="match-card-body">
                  {m.summary && (
                    <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16, margin: "0 0 16px" }}>
                      {m.summary}
                    </p>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {m.competencies.map((c: string) => (
                      <span key={c} className="badge badge-purple">{c}</span>
                    ))}
                  </div>

                  {m.certifications.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {m.certifications.slice(0, 5).map((c: string) => (
                        <span key={c} className="badge badge-blue">{c}</span>
                      ))}
                      {m.certifications.length > 5 && (
                        <span className="badge badge-gray">+{m.certifications.length - 5} lainnya</span>
                      )}
                    </div>
                  )}

                  {m.teaching_topics && m.teaching_topics.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 6 }}>
                        📋 Topik yang pernah diajarkan
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {m.teaching_topics.slice(0, searchMode === "topic" ? 20 : 4).map((t: string) => {
                          const isMatched = searchMode === "topic" && m.matched_topics?.includes(t);
                          return (
                            <span key={t} style={{
                              fontSize: 11.5, padding: "3px 8px",
                              background: isMatched ? "#f0fdf4" : "var(--surface-2)",
                              border: `1px solid ${isMatched ? "#86efac" : "var(--border)"}`,
                              borderRadius: 6,
                              color: isMatched ? "#15803d" : "var(--text-secondary)",
                              fontWeight: isMatched ? 600 : 400,
                            }}>{isMatched ? "✓ " : ""}{t}</span>
                          );
                        })}
                        {m.teaching_topics.length > (searchMode === "topic" ? 20 : 4) && (
                          <span className="badge badge-gray">+{m.teaching_topics.length - (searchMode === "topic" ? 20 : 4)} topik lainnya</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
