import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ carpeta image en la raíz
const HEADER_IMG = path.join(__dirname, "..", "image", "espam-header.png");

const fmtDateTime = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

const avg = (nums) => {
  const arr = (nums || []).filter((n) => typeof n === "number");
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const drawHeaderImage = (doc) => {
  const left = doc.page.margins.left;
  const right = doc.page.margins.right;

  if (fs.existsSync(HEADER_IMG)) {
    doc.image(HEADER_IMG, left, 18, {
      width: doc.page.width - left - right,
    });
  }

  const yLine = 95;
  doc
    .moveTo(left, yLine)
    .lineTo(doc.page.width - right, yLine)
    .lineWidth(1)
    .strokeColor("#cfcfcf")
    .stroke();

  doc.y = yLine + 15;
};

const ensureSpace = (doc, minBottom = 90) => {
  if (doc.y > doc.page.height - minBottom) {
    doc.addPage(); // ✅ pageAdded dibuja el header
    doc.moveDown(0.5);
  }
};

const drawCards = (doc, cards) => {
  const left = doc.page.margins.left;
  const right = doc.page.margins.right;

  const gap = 12;
  const cardW = (doc.page.width - left - right - gap * 2) / 3;
  const cardH = 55;

  const y = doc.y;

  cards.forEach((c, idx) => {
    const x = left + idx * (cardW + gap);

    doc
      .roundedRect(x, y, cardW, cardH, 10)
      .lineWidth(1)
      .strokeColor("#000")
      .stroke();

    doc.fontSize(11).fillColor("#666").text(c.title, x + 12, y + 10, { width: cardW - 24 });
    doc.fontSize(18).fillColor("#000").text(String(c.value), x + 12, y + 28, { width: cardW - 24 });
  });

  doc.y = y + cardH + 18;
};

const drawTable = (doc, { headers, widths, rows }) => {
  const left = doc.page.margins.left;
  const right = doc.page.margins.right;
  const tableWidth = doc.page.width - left - right;

  const headerH = 22;
  const rowH = 20;

  // ✅ Nuevo cambio: widths SIEMPRE ajustados al ancho real disponible
  const sum = widths.reduce((a, b) => a + b, 0) || 1;
  let w = widths.map((v) => (v / sum) * tableWidth);

  // Ajuste final para que cierre EXACTO (por decimales)
  const wSum = w.reduce((a, b) => a + b, 0);
  w[w.length - 1] += tableWidth - wSum;

  // helper: recorta texto si es muy largo (sin saltar de línea)
  const fit = (text, maxWidth) => {
    const s = String(text ?? "");
    if (!s) return "";
    if (doc.widthOfString(s) <= maxWidth) return s;

    let out = s;
    while (out.length > 0 && doc.widthOfString(out ) > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length ? out: "";
  };

  // ===== HEADER =====
  const yHeader = doc.y;

  // fondo header
  doc.rect(left, yHeader, tableWidth, headerH).fill("#f2f2f2");
  doc.fillColor("#000");

  // ✅ Nuevo cambio: clip del header para que NO se salga
  doc.save();
  doc.rect(left, yHeader, tableWidth, headerH).clip();

  let x = left;
  headers.forEach((h, i) => {
    const cellW = w[i];
    doc.fontSize(10).text(fit(h, cellW - 12), x + 6, yHeader + 6, {
      width: cellW - 12,
      lineBreak: false,
    });
    x += cellW;
  });

  doc.restore();

  doc.y = yHeader + headerH;

  // línea debajo del header
  doc
    .moveTo(left, doc.y)
    .lineTo(doc.page.width - right, doc.y)
    .strokeColor("#d9d9d9")
    .stroke();

  // ===== ROWS =====
  for (const r of rows) {
    ensureSpace(doc, 80);

    const yRow = doc.y;

    // ✅ Nuevo cambio: clip de la fila para que NO se salga nada
    doc.save();
    doc.rect(left, yRow, tableWidth, rowH).clip();

    let cx = left;
    r.forEach((cell, i) => {
      const cellW = w[i];
      const txt = fit(cell, cellW - 12);

      doc.fontSize(10).fillColor("#000").text(txt, cx + 6, yRow + 5, {
        width: cellW - 12,
        lineBreak: false,
      });

      cx += cellW;
    });

    doc.restore();

    doc.y = yRow + rowH;

    // línea de separación
    doc
      .moveTo(left, doc.y)
      .lineTo(doc.page.width - right, doc.y)
      .strokeColor("#eeeeee")
      .stroke();
  }

  doc.moveDown(0.6);
};


export const buildPdfBuffer = (renderFn) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });

      // ✅ header en todas las páginas
      doc.on("pageAdded", () => drawHeaderImage(doc));

      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      renderFn(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ✅ FORMATO 2 + LOGO (sin filtros) + NOMBRE
export const renderReportePdf = (doc, { tipo, data, meta }) => {
  // header en primera página
  drawHeaderImage(doc);

  // título
  doc.fontSize(22).fillColor("#000").text("Reporte - Gestión de Tutorías", { underline: true });
  doc.moveDown(0.2);

  doc.fontSize(11).fillColor("#666").text(`Tipo: ${tipo} | Generado: ${new Date().toLocaleString()}`);
  doc.moveDown(0.6);

  // ✅ nombre del “dueño” del reporte (estudiante/tutor/admin)
  if (meta?.label && meta?.name) {
    doc.fontSize(12).fillColor("#000").text(`${meta.label}:  ${meta.name}`);
    doc.moveDown(0.8);
  }

  // cards + tabla según tipo
  if (tipo === "estudiante") {
    const resumen = data?.resumen || {};
    const asistio = resumen?.asistencia?.asistio ?? 0;
    const prom = resumen?.promedioCalificacion;

    drawCards(doc, [
      { title: "Inscripciones", value: resumen.totalInscripciones ?? 0 },
      { title: "Asistió", value: asistio },
      { title: "Prom. calificación", value: prom ? prom.toFixed(2) : "-" },
    ]);

    const rows = (data?.inscripciones || []).map((i) => [
      fmtDateTime(i?.tutoria?.fecha),
      i?.tutoria?.materia ?? "",
      i?.tutoria?.tema ?? "",
      i?.tutoria?.estado ?? "",
      i?.asistencia ?? "",
      i?.calificacion ?? "",
    ]);

    drawTable(doc, {
      headers: ["Fecha", "Materia", "Tema", "Estado", "Asistencia", "Calif."],
      widths: [150, 95, 150, 70, 90, 50],
      rows,
    });

    return;
  }

  if (tipo === "tutor") {
    const resumen = data?.resumen || {};
    const prom = resumen?.promedioCalificacion;

    drawCards(doc, [
      { title: "Tutorías", value: resumen.totalTutorias ?? 0 },
      { title: "Inscritos", value: resumen.totalInscritos ?? 0 },
      { title: "Prom. calificación", value: prom ? prom.toFixed(2) : "-" },
    ]);

    const rows = (data?.tutorias || []).map((t) => [
      fmtDateTime(t.fecha),
      t.materia ?? "",
      t.tema ?? "",
      t.estado ?? "",
      t.inscritos ?? 0,
      t.promedioCalificacion ? t.promedioCalificacion.toFixed(2) : "-",
    ]);

    drawTable(doc, {
      headers: ["Fecha", "Materia", "Tema", "Estado", "Inscr.", "Prom."],
      widths: [150, 95, 170, 80, 55, 40],
      rows,
    });

    return;
  }

  // tipo semanal/admin
  if (tipo === "semanal") {
    const resumen = data?.resumen || {};
    const prom = resumen?.promedioCalificacion;

    drawCards(doc, [
      { title: "Tutorías", value: resumen.totalTutorias ?? 0 },
      { title: "Inscritos", value: resumen.totalInscritos ?? 0 },
      { title: "Prom. calificación", value: prom ? prom.toFixed(2) : "-" },
    ]);

    const rows = (data?.tutorias || []).map((t) => {
      const ins = t.inscripciones || [];
      const califs = ins.map((i) => i.calificacion ?? null).filter((x) => x !== null);
      const promRow = avg(califs);

      const tutorNombre =
        t?.tutor?.UserModel?.nombre ||
        t?.tutor?.User?.nombre ||
        t?.tutor?.user?.nombre ||
        "";

      return [
        fmtDateTime(t.fecha),
        tutorNombre,
        t.materia ?? "",
        t.tema ?? "",
        t.estado ?? "",
        ins.length,
      ];
    });

    drawTable(doc, {
      headers: ["Fecha", "Tutor", "Materia", "Tema", "Estado", "Inscripción"],
      widths: [145, 95, 85, 150, 85, 80],
      rows,
    });

    return;
  }

  // fallback
  doc.fontSize(11).fillColor("#000").text("Tipo de reporte no soportado.");
};
