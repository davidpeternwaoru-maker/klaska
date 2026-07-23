// Formal OFFICIAL ACADEMIC TRANSCRIPT — a conservative, standards-style document
// (jsPDF + autotable, dynamically imported). Not a report card: official header,
// identity block with photo, chronological session/term history, cumulative
// summary, attendance, grading key, and signed footer with serial + stamp space.

import type { TranscriptData } from "@/server/services/transcripts";

const INK: [number, number, number] = [26, 26, 24];
const GREEN: [number, number, number] = [27, 94, 32];
const MUTED: [number, number, number] = [110, 110, 104];
const LINE: [number, number, number] = [205, 205, 200];

async function build(data: TranscriptData) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;
  let y = 14;

  // ---------- official header ----------
  if (data.school.logoUrl) {
    try {
      const fmt = data.school.logoUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(data.school.logoUrl, fmt, M, y - 2, 18, 18);
    } catch {}
  }
  doc.setTextColor(...GREEN);
  doc.setFont("times", "bold");
  doc.setFontSize(19);
  doc.text(data.school.name.toUpperCase(), W / 2, y + 3, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const contact = [data.school.address, [data.school.phone, data.school.email].filter(Boolean).join(" · ")].filter(Boolean);
  let hy = y + 8;
  contact.forEach((line) => {
    doc.text(line as string, W / 2, hy, { align: "center" });
    hy += 4;
  });
  // title bar
  y = hy + 2;
  doc.setFillColor(...INK);
  doc.rect(M, y, W - 2 * M, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("OFFICIAL ACADEMIC TRANSCRIPT", W / 2, y + 5.6, { align: "center" });
  // serial + issue date
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  y += 12;
  doc.text(`Serial: ${data.serial}`, M, y);
  doc.text(`Date issued: ${data.issuedAt}`, W - M, y, { align: "right" });
  doc.text(`Section: ${data.sectionLabel}`, W / 2, y, { align: "center" });
  y += 4;

  // ---------- identity block ----------
  const boxY = y;
  const photoW = 26,
    photoH = 30;
  const photoX = W - M - photoW;
  // photo
  doc.setDrawColor(...LINE);
  doc.rect(photoX, boxY, photoW, photoH);
  if (data.student.photoUrl) {
    try {
      const fmt = data.student.photoUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(data.student.photoUrl, fmt, photoX + 0.5, boxY + 0.5, photoW - 1, photoH - 1);
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text("PHOTO", photoX + photoW / 2, boxY + photoH / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("PHOTO", photoX + photoW / 2, boxY + photoH / 2, { align: "center" });
  }
  // identity fields (two columns)
  const idRows: [string, string][] = [
    ["Name", data.student.name],
    ["Admission No.", data.student.admissionNo ?? "—"],
    ["Date of birth", data.student.dob],
    ["Sex", data.student.gender === "M" ? "Male" : data.student.gender === "F" ? "Female" : "—"],
    ["Date admitted", data.student.admittedAt],
    ["Date of leaving", data.student.leftAt ?? "—"],
    ["Status", data.student.status.charAt(0) + data.student.status.slice(1).toLowerCase()],
    ["Department", data.student.department ?? "—"],
  ];
  doc.setFontSize(9);
  const colW = (photoX - M - 4) / 2;
  idRows.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const rx = M + col * colW;
    const ry = boxY + 4 + row * 6.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`${r[0]}:`, rx, ry);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(r[1], colW - 26)[0] ?? r[1], rx + 26, ry);
  });
  y = boxY + photoH + 6;

  // ---------- academic history, session by session ----------
  const ensure = (need: number) => {
    if (y + need > doc.internal.pageSize.getHeight() - 24) {
      doc.addPage();
      y = 18;
    }
  };

  let lastSession = "";
  for (const t of data.terms) {
    ensure(26);
    if (t.session !== lastSession) {
      lastSession = t.session;
      doc.setFillColor(234, 242, 234);
      doc.rect(M, y, W - 2 * M, 6, "F");
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...GREEN);
      doc.text(`SESSION ${t.session}`, M + 2, y + 4.2);
      y += 8;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const lvl = `${t.levelLabel}${t.arm ? " " + t.arm : ""}`;
    doc.text(`${t.termLabel}  —  ${lvl}`, M, y);
    y += 1.5;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Subject", "Score", "Grade"]],
      body: t.subjects.map((s) => [s.subject, s.total != null ? String(s.total) : "—", s.grade ?? "—"]),
      styles: { fontSize: 8.5, cellPadding: 1.4, lineColor: LINE, lineWidth: 0.1, textColor: INK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
      columnStyles: { 1: { halign: "center", cellWidth: 24 }, 2: { halign: "center", cellWidth: 24 } },
      theme: "grid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const posText = t.position != null ? `Position: ${t.position}${t.classSize ? " of " + t.classSize : ""}` : "Position: —";
    doc.text(`Term average: ${t.average != null ? t.average.toFixed(2) : "—"}     ${posText}`, M, y + 1);
    y += 6;
  }
  if (data.terms.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No academic records for the selected section.", M, y + 2);
    y += 8;
  }

  // ---------- summary + attendance ----------
  ensure(30);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 5;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("CUMULATIVE SUMMARY", M, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sm = data.summary;
  const summaryLine = [
    `Cumulative average: ${sm.cumulativeAverage != null ? sm.cumulativeAverage.toFixed(2) + "%" : "—"}`,
    `Overall: ${sm.overall}`,
    `Sessions attended: ${sm.sessionsAttended}`,
    `Terms on record: ${sm.termsCovered}`,
  ];
  summaryLine.forEach((l, i) => doc.text(l, M + (i % 2) * (W / 2 - M), y + Math.floor(i / 2) * 5));
  y += 12;
  doc.text(
    `Attendance (period covered): ${data.attendance.present}/${data.attendance.recorded} days present${data.attendance.pct != null ? " (" + data.attendance.pct + "%)" : ""}`,
    M,
    y,
  );
  y += 7;

  // ---------- grading key ----------
  if (data.gradeKey.length) {
    ensure(10 + data.gradeKey.length * 5);
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text("GRADING KEY", M, y);
    y += 1.5;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Grade", "Range", "Remark"]],
      body: data.gradeKey.map((g) => [g.label, g.range, g.remark]),
      styles: { fontSize: 8, cellPadding: 1.1, lineColor: LINE, lineWidth: 0.1 },
      headStyles: { fillColor: [60, 60, 57], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 24, halign: "center" }, 1: { cellWidth: 30, halign: "center" } },
      theme: "grid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  // ---------- remarks ----------
  if (data.remarks) {
    ensure(16);
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text("REMARKS", M, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.splitTextToSize(data.remarks, W - 2 * M).forEach((line: string) => {
      doc.text(line, M, y);
      y += 4.5;
    });
    y += 2;
  }

  // ---------- signed footer ----------
  ensure(34);
  y = Math.max(y, doc.internal.pageSize.getHeight() - 40);
  const third = (W - 2 * M) / 3;
  const sign = (x: number, name: string, role: string) => {
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.2);
    doc.line(x, y + 10, x + third - 8, y + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(name, x, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(role, x, y + 18);
  };
  sign(M, data.principalName, "Principal / Head of School");
  sign(M + third, data.registrarName, "Registrar / Admin Officer");
  // stamp box
  doc.setDrawColor(...LINE);
  doc.rect(M + 2 * third + 4, y - 2, third - 12, 22);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("SCHOOL STAMP", M + 2 * third + 4 + (third - 12) / 2, y + 10, { align: "center" });

  // page numbers + serial watermark on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${data.serial}  ·  Page ${i} of ${pages}  ·  This is an official document of ${data.school.name}.`, W / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }
  return doc;
}

export async function downloadTranscriptPDF(data: TranscriptData) {
  const doc = await build(data);
  doc.save(`transcript-${data.student.name.replace(/\s+/g, "-").toLowerCase()}-${data.serial}.pdf`);
}

export async function printTranscriptPDF(data: TranscriptData) {
  const doc = await build(data);
  const url = URL.createObjectURL(doc.output("blob"));
  const w = window.open(url);
  if (w) w.onload = () => w.print();
}
