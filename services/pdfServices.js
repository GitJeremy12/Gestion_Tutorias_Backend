import PDFDocument from "pdfkit";

export const buildPdfBuffer = (writeFn) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    writeFn(doc);
    doc.end();
  });

// ---------- Helpers de diseño ----------
const pageBottom = (doc) => doc.page.height - doc.page.margins.bottom;
const pageRight = (doc) => doc.page.width - doc.page.margins.right;

const ensureSpace = (doc, neededHeight) => {
  if (doc.y + neededHeight > pageBottom(doc)) doc.addPage();
};

const drawTitle = (doc, title, subtitle) => {
  doc.fontSize(18).text(title, { underline: true });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("gray").text(subtitle);
    doc.fillColor("black");
  }
  doc.moveDown(0.8);
};

const drawCardsRow = (doc, cards) => {
  const gap = 10;
  const totalWidth = pageRight(doc) - doc.page.margins.left;
  const cardW = (totalWidth - gap * (cards.length - 1)) / cards.length;
  const cardH = 52;

  ensureSpace(doc, cardH + 10);

  const y = doc.y;
  let x = doc.page.margins.left;

  for (const c of cards) {
    doc.roundedRect(x, y, cardW, cardH, 8).stroke();

    doc.fontSize(10).fillColor("gray").text(c.label, x + 10, y + 10, { width: cardW - 20 });
    doc.fillColor("black").fontSize(16).text(String(c.value ?? "-"), x + 10, y + 26, { width: cardW - 20 });

    x += cardW + gap;
  }

  doc.y = y + cardH + 14;
};

const drawTable = (doc, { columns, rows, rowHeight = 18 }) => {
  const x0 = doc.page.margins.left;
  const tableWidth = pageRight(doc) - x0;

  const fixed = columns.reduce((acc, c) => acc + (c.width || 0), 0);
  const missing = columns.filter((c) => !c.width).length;
  const autoW = missing > 0 ? (tableWidth - fixed) / missing : 0;

  const cols = columns.map((c) => ({ ...c, width: c.width || autoW }));

  const drawHeader = () => {
    ensureSpace(doc, rowHeight + 6);

    const y = doc.y;
    doc.save();
    doc.rect(x0, y, tableWidth, rowHeight).fill("#03bcd4");
    doc.restore();

    let x = x0;
    doc.fontSize(10).fillColor("black");
    for (const c of cols) {
      doc.text(c.header, x + 4, y + 5, { width: c.width - 8, align: c.align || "left" });
      x += c.width;
    }

    doc.y = y + rowHeight;
  };

  const drawRow = (row) => {
    ensureSpace(doc, rowHeight + 4);

    const y = doc.y;
    let x = x0;

    doc.save();
    doc.strokeColor("#dddddd");
    doc.moveTo(x0, y).lineTo(x0 + tableWidth, y).stroke();
    doc.restore();

    doc.fontSize(9);
    for (const c of cols) {
      const val = row[c.key];
      const text = val === null || val === undefined ? "" : String(val);
      doc.text(text, x + 4, y + 5, { width: c.width - 8, align: c.align || "left" });
      x += c.width;
    }

    doc.y = y + rowHeight;
  };

  drawHeader();
  for (const r of rows) drawRow(r);

  doc.save();
  doc.strokeColor("#050000");
  doc.moveTo(x0, doc.y).lineTo(x0 + tableWidth, doc.y).stroke();
  doc.restore();

  doc.moveDown(0.8);
};

export const renderReportePdf = (doc, { tipo, data, filtros }) => {
  const now = new Date().toLocaleString();
  drawTitle(doc, "Reporte - Gestión de Tutorías", `Tipo: ${tipo} | Generado: ${now}`);

  if (filtros && Object.keys(filtros).length) {
    doc.fontSize(10).fillColor("gray").text(`Filtros: ${JSON.stringify(filtros)}`);
    doc.fillColor("black");
    doc.moveDown(0.6);
  }

  // ---- Tutor ----
  if (tipo === "tutor") {
    const nombre = data.tutor?.User?.nombre || "";
    const email = data.tutor?.User?.email || "";
    doc.fontSize(12).text(`Tutor: ${nombre}  |  ${email}`);
    doc.moveDown(0.6);

    drawCardsRow(doc, [
      { label: "Tutorías", value: data.resumen?.totalTutorias ?? 0 },
      { label: "Inscritos", value: data.resumen?.totalInscritos ?? 0 },
      { label: "Prom. calificación", value: data.resumen?.promedioCalificacion ? data.resumen.promedioCalificacion.toFixed(2) : "-" },
    ]);

    const rows = (data.tutorias || []).map((t) => ({
      fecha: t.fecha ? new Date(t.fecha).toLocaleString() : "",
      materia: t.materia || "",
      tema: t.tema || "",
      estado: t.estado || "",
      inscritos: t.inscritos ?? 0,
      prom: t.promedioCalificacion ? t.promedioCalificacion.toFixed(2) : "",
    }));

    drawTable(doc, {
      columns: [
        { header: "Fecha", key: "fecha", width: 140 },
        { header: "Materia", key: "materia", width: 90 },
        { header: "Tema", key: "tema" },
        { header: "Estado", key: "estado", width: 70 },
        { header: "Inscr.", key: "inscritos", width: 45, align: "right" },
        { header: "Prom.", key: "prom", width: 45, align: "right" },
      ],
      rows,
    });

    return;
  }

  // ---- Estudiante ----
  if (tipo === "estudiante") {
    const nombre = data.estudiante?.User?.nombre || "";
    const email = data.estudiante?.User?.email || "";
    doc.fontSize(12).text(`Estudiante: ${nombre}  |  ${email}`);
    doc.moveDown(0.6);

    drawCardsRow(doc, [
      { label: "Inscripciones", value: data.resumen?.totalInscripciones ?? 0 },
      { label: "Asistió", value: data.resumen?.asistencia?.asistio ?? 0 },
      { label: "Prom. calificación", value: data.resumen?.promedioCalificacion ? data.resumen.promedioCalificacion.toFixed(2) : "-" },
    ]);

    const rows = (data.inscripciones || []).map((i) => ({
      fecha: i.tutoria?.fecha ? new Date(i.tutoria.fecha).toLocaleString() : "",
      materia: i.tutoria?.materia || "",
      tema: i.tutoria?.tema || "",
      estado: i.tutoria?.estado || "",
      asistencia: i.asistencia || "",
      calif: i.calificacion ?? "",
    }));

    drawTable(doc, {
      columns: [
        { header: "Fecha", key: "fecha", width: 140 },
        { header: "Materia", key: "materia", width: 90 },
        { header: "Tema", key: "tema" },
        { header: "Estado", key: "estado", width: 70 },
        { header: "Asistencia", key: "asistencia", width: 70 },
        { header: "Calif.", key: "calif", width: 45, align: "right" },
      ],
      rows,
    });

    return;
  }

  // ---- Semanal ----
  if (tipo === "semanal") {
    const from = data.rango?.from ? new Date(data.rango.from).toLocaleDateString() : "";
    const to = data.rango?.to ? new Date(data.rango.to).toLocaleDateString() : "";
    doc.fontSize(12).text(`Rango: ${from}  -  ${to}`);
    doc.moveDown(0.6);

    drawCardsRow(doc, [
      { label: "Tutorías", value: data.resumen?.totalTutorias ?? 0 },
      { label: "Inscritos", value: data.resumen?.totalInscritos ?? 0 },
      { label: "Prom. calificación", value: data.resumen?.promedioCalificacion ? data.resumen.promedioCalificacion.toFixed(2) : "-" },
    ]);

    const rows = (data.tutorias || []).map((t) => ({
      fecha: t.fecha ? new Date(t.fecha).toLocaleString() : "",
      tutor: t.tutor?.User?.nombre || "",
      materia: t.materia || "",
      tema: t.tema || "",
      estado: t.estado || "",
      inscritos: t.inscripciones?.length || 0,
    }));

    drawTable(doc, {
      columns: [
        { header: "Fecha", key: "fecha", width: 140 },
        { header: "Tutor", key: "tutor", width: 90 },
        { header: "Materia", key: "materia", width: 80 },
        { header: "Tema", key: "tema" },
        { header: "Estado", key: "estado", width: 70 },
        { header: "Inscr.", key: "inscritos", width: 45, align: "right" },
      ],
      rows,
    });
  }
};
