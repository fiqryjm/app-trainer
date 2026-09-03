"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

async function fetchInstructor(id: string) {
  const r = await fetch(`/api/instructors/${id}`);
  if (!r.ok) throw new Error("Not found");
  return r.json();
}

// ── Sub-components ─────────────────────────────────────────

function EditCompetenciesModal({ ins, onClose, onSave }: { ins: any; onClose: () => void; onSave: (list: string[]) => void }) {
  const [text, setText] = useState((ins.competencies || []).map((c: any) => c.competency.name).join("\n"));

  const handleSave = () => {
    const list = text.split("\n").map((s: string) => s.trim()).filter(Boolean);
    onSave(list);
  };

  return (
    <Modal title="✏️ Edit Kompetensi" onClose={onClose}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, marginTop: 0 }}>
        Satu kompetensi per baris. Kompetensi lama akan diganti dengan daftar ini.
      </p>
      <textarea
        className="field-textarea"
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Geothermal\nInstrumentation\nQ-HSE\nPembangkit Listrik"}
        style={{ fontFamily: "monospace", fontSize: 13 }}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={handleSave} className="btn btn-success">💾 Simpan Kompetensi</button>
        <button onClick={onClose} className="btn btn-outline">Batal</button>
      </div>
    </Modal>
  );
}

function EditTeachingModal({ ins, onClose, onSave }: { ins: any; onClose: () => void; onSave: (list: string[]) => void }) {
  const [text, setText] = useState((ins.teaching_topics || []).map((t: any) => t.topic).join("\n"));

  const handleSave = () => {
    const list = text.split("\n").map((s: string) => s.trim()).filter(Boolean);
    onSave(list);
  };

  return (
    <Modal title="✏️ Edit Pengalaman Mengajar" onClose={onClose} wide>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, marginTop: 0 }}>
        Satu judul training/topik per baris. Data lama akan diganti dengan daftar ini.
      </p>
      <textarea
        className="field-textarea"
        rows={14}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Distributed Control Systems (DCS): Theory & Practice\nPLC (Basic, Advanced)\nInstrumentation & Process Control"}
        style={{ fontFamily: "monospace", fontSize: 13 }}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={handleSave} className="btn btn-success">💾 Simpan Topik</button>
        <button onClick={onClose} className="btn btn-outline">Batal</button>
      </div>
    </Modal>
  );
}

function EditCertificationsModal({ ins, onClose, onSave }: { ins: any; onClose: () => void; onSave: (list: { name: string; issuer: string; year: string }[]) => void }) {
  const [certs, setCerts] = useState<{ name: string; issuer: string; year: string }[]>(
    (ins.certifications || []).map((c: any) => ({ name: c.name, issuer: c.issuer ?? "", year: c.year ? String(c.year) : "" }))
  );

  const add = () => setCerts([...certs, { name: "", issuer: "", year: "" }]);
  const remove = (i: number) => setCerts(certs.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, val: string) =>
    setCerts(certs.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  return (
    <Modal title="✏️ Edit Sertifikasi" onClose={onClose} wide>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, marginTop: 0 }}>
        Isi nama, penerbit, dan tahun setiap sertifikasi. Data lama akan diganti.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }}>
        {certs.map((c, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 90px 36px", gap: 8, alignItems: "center" }}>
            <input className="field-input" placeholder="Nama sertifikasi" value={c.name} onChange={(e) => update(i, "name", e.target.value)} style={{ fontSize: 13 }} />
            <input className="field-input" placeholder="Penerbit / Issuer" value={c.issuer} onChange={(e) => update(i, "issuer", e.target.value)} style={{ fontSize: 13 }} />
            <input className="field-input" placeholder="Tahun" type="number" value={c.year} onChange={(e) => update(i, "year", e.target.value)} style={{ fontSize: 13 }} />
            <button onClick={() => remove(i)} style={{ border: "none", background: "#fef2f2", color: "var(--danger)", borderRadius: 6, cursor: "pointer", padding: "8px", fontSize: 14 }}>🗑</button>
          </div>
        ))}
      </div>
      <button onClick={add} className="btn btn-outline" style={{ marginTop: 12, fontSize: 13 }}>
        + Tambah Sertifikasi
      </button>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={() => onSave(certs.filter(c => c.name.trim()))} className="btn btn-success">💾 Simpan Sertifikasi</button>
        <button onClick={onClose} className="btn btn-outline">Batal</button>
      </div>
    </Modal>
  );
}

function ReuploadCVModal({ insId, insName, onClose, onUpdated }: { insId: string; insName: string; onClose: () => void; onUpdated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const doExtract = async () => {
    if (!file) return;
    setExtracting(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/instructors/extract", { method: "POST", body: fd });
    const res = await r.json();
    setExtracting(false);
    if (res.extracted) {
      setDraft({
        ...res.extracted,
        certifications: res.extracted.certifications || [],
        competencies: res.extracted.competencies || [],
        teaching_topics: res.extracted.teaching_topics || [],
        cv_file_url: res.cv_file_url || "",
      });
      setStep("review");
    } else {
      alert("Gagal ekstrak: " + (res.error || "unknown"));
    }
  };

  const doSave = async () => {
    setSaving(true);
    const payload: any = {
      summary: draft.summary,
      years_exp: draft.years_exp,
      location: draft.location,
      availability: draft.availability,
      competencies: draft.competencies,
      certifications: draft.certifications,
      teaching_topics: draft.teaching_topics || [],
    };
    if (draft.cv_file_url) payload.cv_file_url = draft.cv_file_url;

    await fetch(`/api/instructors/${insId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setStep("done");
    onUpdated();
  };

  return (
    <Modal title="🔄 Update CV Instruktur" onClose={onClose} wide>
      {step === "upload" && (
        <>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px" }}>
            Upload CV terbaru <strong>{insName}</strong>. AI akan mengekstrak data baru, lalu Anda bisa review sebelum disimpan.
          </p>
          <div className="upload-zone" style={{ position: "relative", marginBottom: 16 }}>
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div className="upload-icon">{file ? "📋" : "☁️"}</div>
            {file ? (
              <><h3>File dipilih</h3><p className="file-name" style={{ margin: "4px auto 0" }}>{file.name}</p></>
            ) : (
              <><h3>Klik atau seret file PDF</h3><p>CV terbaru instruktur</p></>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={doExtract} disabled={!file || extracting} className="btn btn-primary">
              {extracting ? <><span className="spinner" /> Mengekstrak AI…</> : <>🤖 Ekstrak CV Baru</>}
            </button>
            <button onClick={onClose} className="btn btn-outline">Batal</button>
          </div>
        </>
      )}

      {step === "review" && draft && (
        <>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px" }}>
            Review hasil ekstraksi. Hanya field di bawah ini yang akan diupdate (nama & kontak tidak berubah).
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div className="field">
              <label className="field-label">Pengalaman (tahun)</label>
              <input type="number" className="field-input" value={draft.years_exp ?? ""} onChange={(e) => setDraft({ ...draft, years_exp: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">Ketersediaan</label>
              <select className="field-input" value={draft.availability ?? ""} onChange={(e) => setDraft({ ...draft, availability: e.target.value })}>
                <option value="">— Pilih —</option>
                <option value="Available">Available</option>
                <option value="Booked">Booked</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label">Ringkasan Baru</label>
            <textarea className="field-textarea" rows={3} value={draft.summary ?? ""} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div className="field">
              <label className="field-label">Kompetensi (satu per baris)</label>
              <textarea
                className="field-textarea" rows={5}
                style={{ fontFamily: "monospace", fontSize: 12.5 }}
                value={(draft.competencies || []).join("\n")}
                onChange={(e) => setDraft({ ...draft, competencies: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })}
              />
            </div>
            <div className="field">
              <label className="field-label">Sertifikasi (nama, pisahkan baris)</label>
              <textarea
                className="field-textarea" rows={5}
                style={{ fontFamily: "monospace", fontSize: 12.5 }}
                value={(draft.certifications || []).map((c: any) => typeof c === "string" ? c : c.name).join("\n")}
                onChange={(e) => setDraft({ ...draft, certifications: e.target.value.split("\n").map((s: string) => ({ name: s.trim() })).filter((c: any) => c.name) })}
              />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label className="field-label">📋 Pengalaman Mengajar (satu topik per baris)</label>
            <textarea
              className="field-textarea" rows={6}
              style={{ fontFamily: "monospace", fontSize: 12.5 }}
              placeholder={"Distributed Control Systems (DCS): Theory & Practice\nPLC Basic & Advanced\nProcess Safety Management"}
              value={(draft.teaching_topics || []).join("\n")}
              onChange={(e) => setDraft({ ...draft, teaching_topics: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })}
            />
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
              {(draft.teaching_topics || []).length} topik ditemukan dari CV
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={doSave} disabled={saving} className="btn btn-success">
              {saving ? <><span className="spinner" /> Menyimpan…</> : <>💾 Simpan Update CV</>}
            </button>
            <button onClick={() => setStep("upload")} className="btn btn-outline">← Kembali</button>
          </div>
        </>
      )}

      {step === "done" && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>Data berhasil diperbarui!</h3>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "0 0 20px" }}>
            Kompetensi, sertifikasi, pengalaman mengajar, dan ringkasan instruktur sudah diupdate.
          </p>
          <button onClick={onClose} className="btn btn-primary">Selesai</button>
        </div>
      )}
    </Modal>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: 20,
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card" style={{ width: "100%", maxWidth: wide ? 720 : 520, maxHeight: "90vh", overflow: "auto" }}>
        <div className="card-header">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "var(--text-muted)", padding: 0 }}>×</button>
        </div>
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────

export default function InstructorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEditComps, setShowEditComps] = useState(false);
  const [showEditCerts, setShowEditCerts] = useState(false);
  const [showEditTeaching, setShowEditTeaching] = useState(false);
  const [showReupload, setShowReupload] = useState(false);

  const { data: ins, isLoading, isError } = useQuery({
    queryKey: ["instructor", id],
    queryFn: () => fetchInstructor(id),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["instructor", id] });
    qc.invalidateQueries({ queryKey: ["instructors"] });
  };

  const editMut = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch(`/api/instructors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return r.json();
    },
    onSuccess: () => { invalidate(); setEditing(false); },
  });

  const saveCompsMut = useMutation({
    mutationFn: async (competencies: string[]) => {
      const r = await fetch(`/api/instructors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencies }),
      });
      return r.json();
    },
    onSuccess: () => { invalidate(); setShowEditComps(false); },
  });

  const saveCertsMut = useMutation({
    mutationFn: async (certifications: any[]) => {
      const r = await fetch(`/api/instructors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certifications }),
      });
      return r.json();
    },
    onSuccess: () => { invalidate(); setShowEditCerts(false); },
  });

  const saveTeachingMut = useMutation({
    mutationFn: async (teaching_topics: string[]) => {
      const r = await fetch(`/api/instructors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teaching_topics }),
      });
      return r.json();
    },
    onSuccess: () => { invalidate(); setShowEditTeaching(false); },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/instructors/${id}`, { method: "DELETE" });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["instructors"] }); router.push("/instructors"); },
  });

  const startEdit = () => {
    setForm({
      name: ins.name ?? "", email: ins.email ?? "", phone: ins.phone ?? "",
      years_exp: ins.years_exp ?? "", location: ins.location ?? "",
      availability: ins.availability ?? "", summary: ins.summary ?? "",
    });
    setEditing(true);
  };

  const availColor = (a?: string) => {
    const v = a?.toLowerCase();
    if (v === "available") return "avail-available";
    if (v === "booked") return "avail-booked";
    return "avail-part";
  };

  const availBadgeStyle = (a?: string) => {
    const v = a?.toLowerCase();
    if (v === "available") return { background: "#f0fdf4", color: "#16a34a" };
    if (v === "booked") return { background: "#fef2f2", color: "#dc2626" };
    return { background: "#fffbeb", color: "#92400e" };
  };

  if (isLoading) return (
    <div className="empty-state" style={{ paddingTop: 100 }}>
      <div className="spinner spinner-dark" style={{ width: 32, height: 32, margin: "0 auto 16px" }} />
      <p>Memuat data instruktur…</p>
    </div>
  );

  if (isError || !ins) return (
    <div className="empty-state" style={{ paddingTop: 100 }}>
      <div className="empty-state-icon">⚠️</div>
      <h3>Instruktur tidak ditemukan</h3>
      <Link href="/instructors" className="btn btn-outline" style={{ marginTop: 16 }}>← Kembali</Link>
    </div>
  );

  return (
    <div style={{ animation: "fadeInUp .3s ease", maxWidth: 960 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <Link href="/instructors" style={{ color: "var(--brand)", textDecoration: "none" }}>Instruktur</Link>
        <span>›</span>
        <span>{ins.name}</span>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "28px 28px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--brand), var(--brand-dark))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, color: "white", fontWeight: 700, flexShrink: 0,
                boxShadow: "0 4px 16px rgba(99,102,241,.3)",
              }}>
                {ins.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{ins.name}</h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {ins.years_exp && <span className="badge badge-purple">🎓 {ins.years_exp} tahun pengalaman</span>}
                  {ins.location && <span className="badge badge-gray">📍 {ins.location}</span>}
                  {ins.availability && (
                    <span className="badge" style={availBadgeStyle(ins.availability)}>
                      <span className={`avail-dot ${availColor(ins.availability)}`} style={{ marginRight: 5 }} />
                      {ins.availability}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button onClick={() => setShowReupload(true)} className="btn btn-outline" style={{ fontSize: 13 }}>
                🔄 Update CV
              </button>
              {ins.cv_file_url && (
                <a href={ins.cv_file_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: 13 }}>
                  📄 Lihat CV
                </a>
              )}
              {!editing && <button onClick={startEdit} className="btn btn-primary">✏️ Edit Profil</button>}
              <button onClick={() => setConfirmDelete(true)} className="btn btn-outline" style={{ color: "var(--danger)", borderColor: "#fecaca" }}>🗑️</button>
            </div>
          </div>

          {/* Contacts */}
          <div style={{ display: "flex", gap: 24, padding: "16px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
            {ins.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>📧</span>
                <a href={`mailto:${ins.email}`} style={{ color: "var(--brand)", textDecoration: "none" }}>{ins.email}</a>
              </div>
            )}
            {ins.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                <span>📱</span> {ins.phone}
              </div>
            )}
            {!ins.email && !ins.phone && (
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Tidak ada kontak tersedia</span>
            )}
          </div>
        </div>

        {ins.summary && (
          <div style={{ padding: "20px 28px", background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 8 }}>Ringkasan Profil</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>{ins.summary}</p>
          </div>
        )}
      </div>

      {/* Edit Profile Form */}
      {editing && (
        <div className="draft-panel" style={{ marginBottom: 20 }}>
          <div className="draft-header">
            <span style={{ fontSize: 20 }}>✏️</span>
            <h2>Edit Data Instruktur</h2>
          </div>
          <div className="draft-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 14, marginBottom: 14 }}>
              {[
                { key: "name", label: "Nama" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Telepon" },
                { key: "years_exp", label: "Pengalaman (tahun)", type: "number" },
                { key: "location", label: "Lokasi" },
              ].map((f) => (
                <div key={f.key} className="field">
                  <label className="field-label">{f.label}</label>
                  <input className="field-input" type={f.type ?? "text"} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
              <div className="field">
                <label className="field-label">Ketersediaan</label>
                <select className="field-input" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
                  <option value="">— Pilih —</option>
                  <option value="Available">Available</option>
                  <option value="Booked">Booked</option>
                  <option value="Part-time">Part-time</option>
                </select>
              </div>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">Ringkasan</label>
              <textarea className="field-textarea" rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => editMut.mutate(form)} disabled={editMut.isPending} className="btn btn-success">
                {editMut.isPending ? <><span className="spinner" /> Menyimpan…</> : "💾 Simpan Perubahan"}
              </button>
              <button onClick={() => setEditing(false)} className="btn btn-outline">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Competencies + Certifications */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Competencies */}
        <div className="card">
          <div className="card-header">
            <h2>🧠 Kompetensi</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="badge badge-purple">{(ins.competencies || []).length} bidang</span>
              <button onClick={() => setShowEditComps(true)} className="btn btn-outline" style={{ padding: "5px 12px", fontSize: 12 }}>
                ✏️ Edit
              </button>
            </div>
          </div>
          <div className="card-body">
            {(ins.competencies || []).length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Belum ada kompetensi terdaftar</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(ins.competencies || []).map((c: any) => (
                  <div key={c.competency.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="badge badge-purple" style={{ fontSize: 12.5 }}>{c.competency.name}</span>
                    {c.level && <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>{c.level}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="card">
          <div className="card-header">
            <h2>🏅 Sertifikasi</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="badge badge-blue">{(ins.certifications || []).length} sertifikat</span>
              <button onClick={() => setShowEditCerts(true)} className="btn btn-outline" style={{ padding: "5px 12px", fontSize: 12 }}>
                ✏️ Edit
              </button>
            </div>
          </div>
          <div className="card-body">
            {(ins.certifications || []).length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 0" }}>
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Belum ada sertifikasi terdaftar</p>
                <button onClick={() => setShowEditCerts(true)} className="btn btn-outline" style={{ fontSize: 12 }}>+ Tambah Sertifikasi</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(ins.certifications || []).map((c: any) => (
                  <div key={c.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 12px", background: "var(--surface-2)",
                    borderRadius: 8, border: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🎖️</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
                      {c.issuer && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{c.issuer}</div>}
                      {c.year && <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 2, fontWeight: 500 }}>{c.year}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Teaching Topics */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h2>📋 Pengalaman Mengajar</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge badge-gray">{(ins.teaching_topics || []).length} topik</span>
            <button onClick={() => setShowEditTeaching(true)} className="btn btn-outline" style={{ padding: "5px 12px", fontSize: 12 }}>
              ✏️ Edit
            </button>
          </div>
        </div>
        <div className="card-body">
          {(ins.teaching_topics || []).length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 0" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Belum ada topik training terdaftar</p>
              <button onClick={() => setShowEditTeaching(true)} className="btn btn-outline" style={{ fontSize: 12 }}>+ Tambah Topik</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {(ins.teaching_topics || []).map((t: any, i: number) => (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px",
                  background: "var(--surface-2)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 13,
                }}>
                  <span style={{ color: "var(--brand)", fontWeight: 600, fontSize: 11, minWidth: 20 }}>{i + 1}.</span>
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.4 }}>{t.topic}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CV raw text */}
      {ins.cv_raw_text && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h2>📃 Teks CV</h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>dari hasil ekstraksi AI</span>
          </div>
          <div className="card-body">
            <pre style={{
              fontSize: 12.5, color: "var(--text-secondary)", whiteSpace: "pre-wrap",
              lineHeight: 1.7, maxHeight: 300, overflow: "auto",
              background: "var(--surface-2)", borderRadius: 8,
              padding: "16px", margin: 0, border: "1px solid var(--border)",
            }}>
              {ins.cv_raw_text}
            </pre>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showEditComps && (
        <EditCompetenciesModal
          ins={ins}
          onClose={() => setShowEditComps(false)}
          onSave={(list) => saveCompsMut.mutate(list)}
        />
      )}

      {showEditCerts && (
        <EditCertificationsModal
          ins={ins}
          onClose={() => setShowEditCerts(false)}
          onSave={(list) => saveCertsMut.mutate(list)}
        />
      )}

      {showEditTeaching && (
        <EditTeachingModal
          ins={ins}
          onClose={() => setShowEditTeaching(false)}
          onSave={(list) => saveTeachingMut.mutate(list)}
        />
      )}

      {showReupload && (
        <ReuploadCVModal
          insId={id}
          insName={ins.name}
          onClose={() => setShowReupload(false)}
          onUpdated={invalidate}
        />
      )}

      {confirmDelete && (
        <Modal title="🗑️ Hapus Instruktur" onClose={() => setConfirmDelete(false)}>
          <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
              Data <strong>{ins.name}</strong> beserta semua kompetensi dan sertifikasi akan dihapus permanen.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="btn" style={{ flex: 1, background: "var(--danger)", color: "white", justifyContent: "center" }}>
              {deleteMut.isPending ? <><span className="spinner" /> Menghapus…</> : "Ya, Hapus Permanen"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }}>Batal</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
