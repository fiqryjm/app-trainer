"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";


async function fetchInstructors() {
  const r = await fetch("/api/instructors");
  return r.json();
}

export default function InstructorsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState<any | null>(null);
  const [cvUrl, setCvUrl] = useState<string>("");
  const [filterQ, setFilterQ] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["instructors"],
    queryFn: fetchInstructors,
  });
  const rawList = Array.isArray(data) ? data : [];
  const list = filterQ
    ? rawList.filter((i: any) =>
        i.name.toLowerCase().includes(filterQ.toLowerCase()) ||
        (i.competencies || []).some((c: any) => c.competency.name.toLowerCase().includes(filterQ.toLowerCase()))
      )
    : rawList;

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
      setDraft({
        ...res.extracted,
        experience_highlights: res.extracted.experience_highlights || [],
        certifications: res.extracted.certifications || [],
      });
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
      setDraft(null);
      setFile(null);
      setCvUrl("");
      refetch();
    },
  });

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
        <h1>Database Instruktur</h1>
        <p>Upload CV PDF, ekstrak otomatis dengan AI, dan kelola data instruktur</p>
      </div>

      {/* Upload Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>📄 Upload CV (PDF)</h2>
        </div>
        <div className="card-body">
          <div className="upload-zone" style={{ position: "relative" }} data-has-file={!!file}>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="upload-icon">{file ? "📋" : "☁️"}</div>
            {file ? (
              <>
                <h3>File dipilih</h3>
                <p className="file-name" style={{ margin: "4px auto 0" }}>{file.name}</p>
              </>
            ) : (
              <>
                <h3>Klik atau seret file PDF ke sini</h3>
                <p>Mendukung format PDF — AI akan mengekstrak data secara otomatis</p>
              </>
            )}
          </div>

          {file && (
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                onClick={doExtract}
                disabled={!file || extracting}
                className="btn btn-primary"
              >
                {extracting ? (
                  <>
                    <span className="spinner" />
                    Memproses AI…
                  </>
                ) : (
                  <>🤖 Ekstrak dengan AI</>
                )}
              </button>
              <button
                onClick={() => setFile(null)}
                className="btn btn-outline"
                disabled={extracting}
              >
                Hapus File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Draft */}
      {draft && (
        <div className="draft-panel" style={{ marginBottom: 24 }}>
          <div className="draft-header">
            <span style={{ fontSize: 20 }}>✏️</span>
            <h2>Review Hasil Ekstraksi AI (edit bila perlu)</h2>
          </div>
          <div className="draft-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16, marginBottom: 16 }}>
              <Field label="Nama" value={draft.name ?? ""} onChange={(v) => setDraft({ ...draft, name: v })} />
              <Field label="Email" value={draft.email ?? ""} onChange={(v) => setDraft({ ...draft, email: v })} />
              <Field label="Telepon" value={draft.phone ?? ""} onChange={(v) => setDraft({ ...draft, phone: v })} />
              <Field label="Pengalaman (tahun)" value={draft.years_exp ?? ""} type="number" onChange={(v) => setDraft({ ...draft, years_exp: v })} />
              <Field label="Lokasi" value={draft.location ?? ""} onChange={(v) => setDraft({ ...draft, location: v })} />
              <div className="field">
                <label className="field-label">Ketersediaan</label>
                <select
                  className="field-input"
                  value={draft.availability ?? ""}
                  onChange={(e) => setDraft({ ...draft, availability: e.target.value })}
                >
                  <option value="">— Pilih —</option>
                  <option value="Available">Available</option>
                  <option value="Booked">Booked</option>
                  <option value="Part-time">Part-time</option>
                </select>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label className="field-label">Ringkasan</label>
              <textarea
                className="field-textarea"
                rows={3}
                value={draft.summary ?? ""}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="field">
                <label className="field-label">Kompetensi (pisahkan koma)</label>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={(draft.competencies || []).join(", ")}
                  onChange={(e) =>
                    setDraft({ ...draft, competencies: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })
                  }
                />
              </div>
              <div className="field">
                <label className="field-label">Sertifikasi (nama, pisahkan koma)</label>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={(draft.certifications || []).map((c: any) => c.name).join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      certifications: e.target.value
                        .split(",")
                        .map((s: string) => ({ name: s.trim() }))
                        .filter((c: any) => c.name),
                    })
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => saveMutation.mutate(draft)}
                disabled={saveMutation.isPending}
                className="btn btn-success"
              >
                {saveMutation.isPending ? (
                  <>
                    <span className="spinner" />
                    Menyimpan…
                  </>
                ) : (
                  <>💾 Simpan Instruktur</>
                )}
              </button>
              <button onClick={() => setDraft(null)} className="btn btn-outline">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructor List */}
      <div className="card">
        <div className="card-header">
          <h2>👥 Daftar Instruktur ({rawList.length})</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="field-input"
              style={{ width: 220, padding: "7px 12px", fontSize: 13 }}
              placeholder="🔍 Cari nama / kompetensi…"
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <div className="spinner spinner-dark" style={{ margin: "0 auto 12px" }} />
            <p>Memuat data…</p>
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{filterQ ? "🔍" : "📂"}</div>
            <h3>{filterQ ? "Tidak ditemukan" : "Belum ada instruktur"}</h3>
            <p>{filterQ ? `Tidak ada instruktur yang cocok dengan "${filterQ}"` : "Upload CV pertama di atas"}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Kompetensi</th>
                  <th>Sertifikasi</th>
                  <th>Pengalaman</th>
                  <th>Ketersediaan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((i: any) => (
                  <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => window.location.href = `/instructors/${i.id}`}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--brand)" }}>{i.name}</div>
                      {i.location && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>📍 {i.location}</div>}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(i.competencies || []).slice(0, 3).map((c: any) => (
                          <span key={c.competency.name} className="badge badge-purple">{c.competency.name}</span>
                        ))}
                        {(i.competencies || []).length > 3 && (
                          <span className="badge badge-gray">+{(i.competencies || []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(i.certifications || []).slice(0, 2).map((c: any) => (
                          <span key={c.name} className="badge badge-blue">{c.name}</span>
                        ))}
                        {(i.certifications || []).length > 2 && (
                          <span className="badge badge-gray">+{(i.certifications || []).length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                      {i.years_exp ? `${i.years_exp} thn` : "—"}
                    </td>
                    <td>
                      {i.availability ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div className={`avail-dot ${availColor(i.availability)}`} />
                          <span style={{ fontSize: 13 }}>{i.availability}</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Link href={`/instructors/${i.id}`} className="btn btn-outline" style={{ padding: "5px 12px", fontSize: 12 }}>
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text",
}: {
  label: string; value: any; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
