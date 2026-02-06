import { Op } from "sequelize";
import { TutoriaModel } from "../models/Tutoria.js";
import { InscripcionModel } from "../models/Inscripcion.js";
import { EstudianteModel } from "../models/Estudiante.js";
import { TutorModel } from "../models/Tutor.js";
import { UserModel } from "../models/User.js";
import { buildPdfBuffer, renderReportePdf } from "../services/pdfServices.js"; // ✅ Nuevo cambio: importamos renderReportePdf para PDF con tabla

// ---------- Helpers ----------
const toDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getWeekRange = (base = new Date()) => {
  // Semana Lunes-Domingo
  const d = new Date(base);
  const day = d.getDay(); // 0 dom ... 6 sáb
  const diffToMonday = (day === 0 ? -6 : 1) - day;

  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setMilliseconds(-1);

  return { start, end };
};

const avg = (nums) => {
  const arr = (nums || []).filter((n) => typeof n === "number");
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const groupCount = (items, keyFn) => {
  const map = new Map();
  for (const it of items) {
    const k = keyFn(it);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
};

// ---------- Report builders ----------
const buildEstudianteReport = async (estudianteId) => {
  const estudiante = await EstudianteModel.findByPk(estudianteId, {
    include: [{ model: UserModel, attributes: ["id", "nombre", "email"] }],
  });
  if (!estudiante) return null;

  const inscripciones = await InscripcionModel.findAll({
    where: { estudianteId },
    order: [["fechaInscripcion", "DESC"]],
    include: [
      {
        model: TutoriaModel,
        as: "tutoria",
        include: [
          {
            model: TutorModel,
            as: "tutor",
            include: [{ model: UserModel, attributes: ["id", "nombre", "email"] }],
          },
        ],
      },
    ],
  });

  const asistio = inscripciones.filter((i) => i.asistencia === "asistio").length;
  const falta = inscripciones.filter((i) => i.asistencia === "falta").length;
  const justificada = inscripciones.filter((i) => i.asistencia === "justificada").length;
  const pendiente = inscripciones.filter((i) => i.asistencia === "pendiente").length;

  const califs = inscripciones.map((i) => (i.calificacion ?? null)).filter((x) => x !== null);
  const promedioCalificacion = avg(califs);

  const materias = inscripciones.map((i) => i.tutoria?.materia).filter(Boolean);

  return {
    estudiante,
    resumen: {
      totalInscripciones: inscripciones.length,
      asistencia: { asistio, falta, justificada, pendiente },
      promedioCalificacion,
      topMaterias: groupCount(materias, (m) => m)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    },
    inscripciones,
  };
};

const buildTutorReport = async (tutorId) => {
  const tutor = await TutorModel.findByPk(tutorId, {
    include: [{ model: UserModel, attributes: ["id", "nombre", "email"] }],
  });
  if (!tutor) return null;

  const tutorias = await TutoriaModel.findAll({
    where: { tutorId },
    order: [["fecha", "DESC"]],
    include: [{ model: InscripcionModel, as: "inscripciones" }],
  });

  const totalTutorias = tutorias.length;
  const porEstado = groupCount(tutorias, (t) => t.estado);

  const totalInscritos = tutorias.reduce((acc, t) => acc + (t.inscripciones?.length || 0), 0);

  const todasCalifs = tutorias
    .flatMap((t) => (t.inscripciones || []).map((i) => i.calificacion ?? null))
    .filter((x) => x !== null);

  const promedioCalificacion = avg(todasCalifs);

  const materias = tutorias.map((t) => t.materia).filter(Boolean);
  const topMaterias = groupCount(materias, (m) => m)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // resumen por tutoria (útil para UI)
  const detalleTutorias = tutorias.map((t) => {
    const ins = t.inscripciones || [];
    const califs = ins.map((i) => i.calificacion ?? null).filter((x) => x !== null);
    return {
      id: t.id,
      fecha: t.fecha,
      materia: t.materia,
      tema: t.tema,
      estado: t.estado,
      inscritos: ins.length,
      promedioCalificacion: avg(califs),
    };
  });

  return {
    tutor,
    resumen: {
      totalTutorias,
      totalInscritos,
      promedioCalificacion,
      porEstado,
      topMaterias,
    },
    tutorias: detalleTutorias,
  };
};

const buildSemanalReport = async ({ from, to }) => {
  const tutorias = await TutoriaModel.findAll({
    where: { fecha: { [Op.between]: [from, to] } },
    order: [["fecha", "DESC"]],
    include: [
      { model: TutorModel, as: "tutor", include: [{ model: UserModel, attributes: ["nombre", "email"] }] },
      { model: InscripcionModel, as: "inscripciones" },
    ],
  });

  const totalTutorias = tutorias.length;
  const porEstado = groupCount(tutorias, (t) => t.estado);

  const totalInscritos = tutorias.reduce((acc, t) => acc + (t.inscripciones?.length || 0), 0);

  const califs = tutorias
    .flatMap((t) => (t.inscripciones || []).map((i) => i.calificacion ?? null))
    .filter((x) => x !== null);

  const promedioCalificacion = avg(califs);

  const materias = tutorias.map((t) => t.materia).filter(Boolean);
  const topMaterias = groupCount(materias, (m) => m)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Nota: estas variables no se usan, pero las dejo porque ya estaban en tu archivo
  const tutores = tutorias
    .map((t) => t.tutor?.User?.nombre || t.tutor?.user?.nombre || t.tutor?.UserModel?.nombre || t.tutor?.user?.nombre)
    .filter(Boolean);

  // Mejor: usa el nombre desde include UserModel sin inventar propiedades
  const tutorNombres = tutorias.map((t) => t.tutor?.user?.nombre).filter(Boolean);

  return {
    rango: { from, to },
    resumen: {
      totalTutorias,
      totalInscritos,
      promedioCalificacion,
      porEstado,
      topMaterias,
      // si quieres top tutores por #tutorias, mejor calcula por tutorId
      topTutores: groupCount(tutorias, (t) => String(t.tutorId))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    },
    tutorias,
  };
};

// ---------- Controllers ----------
export const getByEstudiante = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;

    let estudianteId = req.params.estudianteId ? Number(req.params.estudianteId) : null;

    // estudiante: solo su propio reporte
    if (rol === "estudiante") {
      const est = await EstudianteModel.findOne({ where: { userId } });
      if (!est) return res.status(403).json({ message: "Solo estudiantes" });
      estudianteId = est.id;
    }

    // admin: puede pedir por params
    if (rol === "admin") {
      if (!estudianteId) return res.status(400).json({ message: "Debes enviar estudianteId" });
    }

    if (!estudianteId) return res.status(403).json({ message: "Forbidden" });

    const report = await buildEstudianteReport(estudianteId);
    if (!report) return res.status(404).json({ message: "Estudiante no encontrado" });

    return res.json(report);
  } catch (err) {
    console.error("❌ Error getByEstudiante:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

export const getByTutor = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;

    let tutorId = req.params.tutorId ? Number(req.params.tutorId) : null;

    // tutor: solo su propio reporte
    if (rol === "tutor") {
      const tut = await TutorModel.findOne({ where: { userId } });
      if (!tut) return res.status(403).json({ message: "Solo tutores" });
      tutorId = tut.id;
    }

    // admin: puede pedir por params
    if (rol === "admin") {
      if (!tutorId) return res.status(400).json({ message: "Debes enviar tutorId" });
    }

    if (!tutorId) return res.status(403).json({ message: "Forbidden" });

    const report = await buildTutorReport(tutorId);
    if (!report) return res.status(404).json({ message: "Tutor no encontrado" });

    return res.json(report);
  } catch (err) {
    console.error("❌ Error getByTutor:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

export const getSemanal = async (req, res) => {
  try {
    // Recomendado: solo admin
    // (si quieres permitir tutor, se puede filtrar por tutorId)
    const rol = req.user?.rol;
    if (rol !== "admin") return res.status(403).json({ message: "Forbidden" });

    const { from, to } = req.query;

    let range;
    if (from && to) {
      const a = toDate(from);
      const b = toDate(to);
      if (!a || !b) return res.status(400).json({ message: "from/to inválidos" });
      range = { start: a, end: b };
    } else {
      range = getWeekRange(new Date());
    }

    const report = await buildSemanalReport({ from: range.start, to: range.end });
    return res.json(report);
  } catch (err) {
    console.error("❌ Error getSemanal:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

export const exportPDF = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;

    // tipo: estudiante | tutor | semanal
    const { tipo, id, from, to } = req.query;

    if (!tipo) return res.status(400).json({ message: "Debes enviar tipo (estudiante|tutor|semanal)" });

    let data = null;
    let filename = "reporte.pdf";

    if (tipo === "estudiante") {
      let estudianteId = id ? Number(id) : null;

      if (rol === "estudiante") {
        const est = await EstudianteModel.findOne({ where: { userId } });
        if (!est) return res.status(403).json({ message: "Solo estudiantes" });
        estudianteId = est.id;
      } else if (rol !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!estudianteId) return res.status(400).json({ message: "Falta id del estudiante" });

      data = await buildEstudianteReport(estudianteId);
      if (!data) return res.status(404).json({ message: "Estudiante no encontrado" });

      filename = `reporte-estudiante-${estudianteId}.pdf`;
    }

    if (tipo === "tutor") {
      let tutorId = id ? Number(id) : null;

      if (rol === "tutor") {
        const tut = await TutorModel.findOne({ where: { userId } });
        if (!tut) return res.status(403).json({ message: "Solo tutores" });
        tutorId = tut.id;
      } else if (rol !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!tutorId) return res.status(400).json({ message: "Falta id del tutor" });

      data = await buildTutorReport(tutorId);
      if (!data) return res.status(404).json({ message: "Tutor no encontrado" });

      filename = `reporte-tutor-${tutorId}.pdf`;
    }

    if (tipo === "semanal") {
      if (rol !== "admin") return res.status(403).json({ message: "Forbidden" });

      let range;
      if (from && to) {
        const a = toDate(from);
        const b = toDate(to);
        if (!a || !b) return res.status(400).json({ message: "from/to inválidos" });
        range = { start: a, end: b };
      } else {
        range = getWeekRange(new Date());
      }

      data = await buildSemanalReport({ from: range.start, to: range.end });
      filename = `reporte-semanal.pdf`;
    }

    if (!data) return res.status(400).json({ message: "Tipo de reporte inválido" });

    // ✅ Nuevo cambio: ahora generamos un PDF "bonito" (cards + tabla) usando renderReportePdf
    const filtros = { tipo, id, from, to }; // ✅ Nuevo cambio
    const pdf = await buildPdfBuffer((doc) => {
      renderReportePdf(doc, { tipo, data, filtros }); // ✅ Nuevo cambio
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdf);
  } catch (err) {
    console.error("❌ Error exportPDF:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};
