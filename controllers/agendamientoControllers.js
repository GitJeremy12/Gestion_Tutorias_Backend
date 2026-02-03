import { Op } from "sequelize";
import { sequelize } from "../Db/conexion.js";
import { AgendamientoModel } from "../models/Agendamiento.js";
import { EstudianteModel } from "../models/Estudiante.js";
import { TutorModel } from "../models/Tutor.js";
import { UserModel } from "../models/User.js";

// ---------- Helpers de disponibilidad ----------

const normalizeKey = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes: miércoles -> miercoles

const dayNameEs = (date) => {
  const d = date.getDay(); // 0 domingo .. 6 sábado
  const map = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return map[d];
};

const timeToMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const isTimeWithinRanges = (date, ranges) => {
  // ranges: ["08:00-10:00", "14:00-16:00"]
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const t = timeToMinutes(`${hh}:${mm}`);
  if (t === null) return false;

  for (const r of ranges || []) {
    const [start, end] = String(r).split("-");
    const a = timeToMinutes(start);
    const b = timeToMinutes(end);
    if (a === null || b === null) continue;

    // Inclusivo inicio, exclusivo fin (08:00 vale, 10:00 no)
    if (t >= a && t < b) return true;
  }
  return false;
};

const parseDisponibilidad = (disp) => {
  // TutorModel.get() ya intenta devolver objeto, pero por si viene string:
  if (!disp) return null;

  if (typeof disp === "object") return disp;

  if (typeof disp === "string") {
    try {
      const parsed = JSON.parse(disp);
      return typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

// ---------- Controllers ----------

// POST /api/agendamientos
// body: { tutorId, fechaProgramada, materia } (estudianteId solo si admin)
export const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;

    const { tutorId, fechaProgramada, materia } = req.body;

    if (!tutorId || !fechaProgramada || !materia) {
      await t.rollback();
      return res.status(400).json({ message: "Faltan campos: tutorId, fechaProgramada, materia" });
    }

    const fecha = new Date(fechaProgramada);
    if (Number.isNaN(fecha.getTime())) {
      await t.rollback();
      return res.status(400).json({ message: "fechaProgramada inválida" });
    }

    // Recomendado: solo permitir futuras
    if (fecha.getTime() < Date.now()) {
      await t.rollback();
      return res.status(400).json({ message: "No puedes agendar en el pasado" });
    }

    // Resolver estudianteId
    let estudianteId = null;

    if (rol === "admin") {
      // admin puede enviar estudianteId
      estudianteId = req.body.estudianteId ?? null;
      if (!estudianteId) {
        await t.rollback();
        return res.status(400).json({ message: "Como admin debes enviar estudianteId" });
      }
    } else {
      // estudiante normal: se obtiene por userId del token
      if (!userId) {
        await t.rollback();
        return res.status(401).json({ message: "Unauthorized" });
      }

      const est = await EstudianteModel.findOne({ where: { userId }, transaction: t });
      if (!est) {
        await t.rollback();
        return res.status(403).json({ message: "Solo estudiantes pueden agendar" });
      }
      estudianteId = est.id;
    }

    // Validar tutor existe
    const tutor = await TutorModel.findByPk(tutorId, { transaction: t });
    if (!tutor) {
      await t.rollback();
      return res.status(404).json({ message: "Tutor no encontrado" });
    }

    // Validar disponibilidad del tutor
    const dispObj = parseDisponibilidad(tutor.disponibilidad);

    if (!dispObj) {
      // si no hay disponibilidad configurada, define la regla:
      // aquí lo bloqueamos para que no se agende sin horarios
      await t.rollback();
      return res.status(400).json({ message: "El tutor no tiene disponibilidad configurada" });
    }

    const dia = dayNameEs(fecha); // lunes..domingo (sin tilde)
    const diaKey = normalizeKey(dia);

    // Acepta "miercoles" o "miércoles" guardados: normalizamos keys del objeto
    let ranges = null;
    for (const k of Object.keys(dispObj)) {
      if (normalizeKey(k) === diaKey) {
        ranges = dispObj[k];
        break;
      }
    }

    if (!Array.isArray(ranges) || ranges.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: `El tutor no atiende el día ${dia}` });
    }

    const okHorario = isTimeWithinRanges(fecha, ranges);
    if (!okHorario) {
      await t.rollback();
      return res.status(400).json({ message: "La hora no coincide con la disponibilidad del tutor" });
    }

    // Evitar doble reserva exacta (mismo tutor + misma fecha/hora)
    const conflict = await AgendamientoModel.findOne({
      where: {
        tutorId,
        fechaProgramada: fecha,
        estado: { [Op.in]: ["pendiente", "confirmada"] },
      },
      transaction: t,
    });

    if (conflict) {
      await t.rollback();
      return res.status(409).json({ message: "El tutor ya tiene una cita en ese horario" });
    }

    const ag = await AgendamientoModel.create(
      {
        estudianteId,
        tutorId,
        fechaProgramada: fecha,
        materia,
        estado: "pendiente",
        notificacionEnviada: false,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json(ag);
  } catch (err) {
    await t.rollback();
    console.error("❌ Error en create agendamiento:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

// GET /api/agendamientos/upcoming
export const getUpcoming = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;

    const now = new Date();

    const where = {
      fechaProgramada: { [Op.gte]: now },
      estado: { [Op.ne]: "cancelada" },
    };

    // Filtrar según rol
    if (rol === "estudiante") {
      const est = await EstudianteModel.findOne({ where: { userId } });
      if (!est) return res.status(403).json({ message: "Solo estudiantes pueden ver sus próximas citas" });
      where.estudianteId = est.id;
    } else if (rol === "tutor") {
      const tut = await TutorModel.findOne({ where: { userId } });
      if (!tut) return res.status(403).json({ message: "Solo tutores pueden ver sus próximas citas" });
      where.tutorId = tut.id;
    } else if (rol !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const citas = await AgendamientoModel.findAll({
      where,
      order: [["fechaProgramada", "ASC"]],
      include: [
        { model: TutorModel, include: [{ model: UserModel, attributes: ["id", "nombre", "email"] }] },
        { model: EstudianteModel, include: [{ model: UserModel, attributes: ["id", "nombre", "email"] }] },
      ],
    });

    return res.json(citas);
  } catch (err) {
    console.error("❌ Error en getUpcoming:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

// PUT /api/agendamientos/:id/cancel
export const cancel = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;
    const { id } = req.params;

    const ag = await AgendamientoModel.findByPk(id, { transaction: t });
    if (!ag) {
      await t.rollback();
      return res.status(404).json({ message: "Agendamiento no encontrado" });
    }

    // Permisos: admin, o estudiante dueño, o tutor asignado
    let allowed = false;

    if (rol === "admin") allowed = true;

    if (rol === "estudiante") {
      const est = await EstudianteModel.findOne({ where: { userId }, transaction: t });
      if (est && est.id === ag.estudianteId) allowed = true;
    }

    if (rol === "tutor") {
      const tut = await TutorModel.findOne({ where: { userId }, transaction: t });
      if (tut && tut.id === ag.tutorId) allowed = true;
    }

    if (!allowed) {
      await t.rollback();
      return res.status(403).json({ message: "Forbidden" });
    }

    if (ag.estado === "cancelada") {
      await t.rollback();
      return res.status(400).json({ message: "El agendamiento ya está cancelado" });
    }

    ag.estado = "cancelada";
    await ag.save({ transaction: t });

    await t.commit();
    return res.json({ message: "Agendamiento cancelado" });
  } catch (err) {
    await t.rollback();
    console.error("❌ Error en cancel:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

// PUT /api/agendamientos/:id/confirm
export const confirm = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;
    const { id } = req.params;

    const ag = await AgendamientoModel.findByPk(id, { transaction: t });
    if (!ag) {
      await t.rollback();
      return res.status(404).json({ message: "Agendamiento no encontrado" });
    }

    // Permisos: admin, o estudiante dueño, o tutor asignado
    let allowed = false;

    if (rol === "admin") allowed = true;

    if (rol === "estudiante") {
      const est = await EstudianteModel.findOne({ where: { userId }, transaction: t });
      if (est && est.id === ag.estudianteId) allowed = true;
    }

    if (rol === "tutor") {
      const tut = await TutorModel.findOne({ where: { userId }, transaction: t });
      if (tut && tut.id === ag.tutorId) allowed = true;
    }

    if (!allowed) {
      await t.rollback();
      return res.status(403).json({ message: "Forbidden" });
    }

    if (ag.estado === "cancelada") {
      await t.rollback();
      return res.status(400).json({ message: "No puedes confirmar un agendamiento cancelado" });
    }

    ag.estado = "confirmada";
    await ag.save({ transaction: t });

    await t.commit();
    return res.json({ message: "Agendamiento confirmado" });
  } catch (err) {
    await t.rollback();
    console.error("❌ Error en confirm:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

