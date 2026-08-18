import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

async function fetchInstructors() {
  const r = await fetch("/api/instructors");
  return r.json();
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["instructors"], queryFn: fetchInstructors });
  const list = Array.isArray(data) ? data : [];
  const total = list.length;
  const comps = new Set();
  list.forEach((i: any) => (i.competencies || []).forEach((c: any) => comps.add(c.competency.name)));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded shadow p-5">
          <div className="text-sm text-slate-500">Total Instruktur</div>
          <div className="text-3xl font-bold">{isLoading ? "…" : total}</div>
        </div>
        <div className="bg-white rounded shadow p-5">
          <div className="text-sm text-slate-500">Kompetensi Terdaftar</div>
          <div className="text-3xl font-bold">{comps.size}</div>
        </div>
        <div className="bg-white rounded shadow p-5">
          <div className="text-sm text-slate-500">Quick Action</div>
          <a href="/instructors" className="text-blue-600 font-medium">+ Upload CV Instruktur</a>
        </div>
      </div>
    </div>
  );
}
