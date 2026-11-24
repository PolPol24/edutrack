"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export type AcademicTermContext = { term_name: string; year_label: string };

export function useAcademicContext() {
  const [term, setTerm] = useState<AcademicTermContext | null>(null);

  useEffect(() => {
    apiRequest<{ term: AcademicTermContext | null }>("academic_context")
      .then((response) => setTerm(response.term))
      .catch(() => setTerm(null));
  }, []);

  return term;
}

export function formatAcademicTerm(term: AcademicTermContext | null) {
  if (!term) return "No active semester configured";
  const semester = term.term_name === "1st semester" ? "1st Semester" : term.term_name === "2nd semester" ? "2nd Semester" : term.term_name;
  return `${semester} · ${term.year_label}`;
}
