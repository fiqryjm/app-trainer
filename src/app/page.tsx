"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

async function fetchInstructors() {
  const r = await fetch("/api/instructors");
  return r.json();
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["instructors"], queryFn: fetchInstructors });
  const list = Array.isArray(data) ? data : [];
  const total = list.length;
  const comps = new Set<string>();
  const available = list.filter((i: any) => i.availability?.toLowerCase() === "available").length;
  list.forEach((i: any) => (i.competencies || []).forEach((c: any) => comps.add(c.competency.name)));

  const stats = [
    {
      icon: "👥",
      label: "Total Instruktur",
      value: isLoading ? "…" : total,
      color: "#6366f1",
      bg: "rgba(99,102,241,.08)",
      link: "/instructors",
      linkLabel: "Lihat semua →",
    },
    {
      icon: "🧠",
      label: "Kompetensi Terdaftar",
      value: comps.size,
      color: "#10b981",
      bg: "rgba(16,185,129,.08)",
      link: "/instructors",
      linkLabel: "Lihat daftar →",
    },
    {
      icon: "✅",
      label: "Instruktur Tersedia",
      value: isLoading ? "…" : available,
      color: "#f59e0b",
      bg: "rgba(245,158,11,.08)",
      link: "/match",
      linkLabel: "Cari instruktur →",
    },
  ];

  return (
    <div style={{ animation: "fadeInUp .3s ease" }}>
      {/* Header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Selamat datang di FJM Instructor Database — kelola dan temukan instruktur terbaik</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: s.bg }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
            </div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            <Link href={s.link} style={{ fontSize: 12, color: s.color, textDecoration: "none", fontWeight: 500, marginTop: 12, display: "inline-block" }}>
              {s.linkLabel}
            </Link>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2>⚡ Quick Actions</h2>
        </div>
        <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/instructors" className="btn btn-primary">
            📄 Upload CV Instruktur Baru
          </Link>
          <Link href="/match" className="btn btn-success">
            🤖 Cari Instruktur untuk Training
          </Link>
        </div>
      </div>

      {/* Recent instructors */}
      {!isLoading && list.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>👥 Instruktur Terbaru</h2>
            <Link href="/instructors" className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 12 }}>
              Lihat Semua
            </Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Kompetensi Unggulan</th>
                  <th>Pengalaman</th>
                  <th>Ketersediaan</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 5).map((i: any) => {
                  const avail = i.availability?.toLowerCase();
                  const dotClass = avail === "available" ? "avail-available" : avail === "booked" ? "avail-booked" : "avail-part";
                  return (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 600 }}>{i.name}</td>
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
                      <td style={{ color: "var(--text-secondary)" }}>{i.years_exp ? `${i.years_exp} thn` : "—"}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div className={`avail-dot ${dotClass}`} />
                          <span style={{ fontSize: 13 }}>{i.availability || "—"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <h3>Belum ada instruktur</h3>
            <p>Mulai dengan mengupload CV instruktur pertama Anda</p>
            <Link href="/instructors" className="btn btn-primary" style={{ marginTop: 16 }}>
              📄 Upload CV Pertama
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
