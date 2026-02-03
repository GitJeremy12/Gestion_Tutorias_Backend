import { Op } from "sequelize";
import { TutoriaModel } from "../models/Tutoria.js";

/**
 * POST /api/tutorias
 * Crear nueva tutoría
 */
export const create = async (req, res) => {
  try {
    const {
      estudianteId,
      tutorId,
      fecha,
      materia,
      tema,
      observaciones,
      duracion,
      estado,
    } = req.body;

    // Validaciones mínimas
    if (!estudianteId || !tutorId || !fecha || !materia || !tema || !duracion) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const fechaDate = new Date(fecha);
    if (Number.isNaN(fechaDate.getTime())) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    const tutoria = await TutoriaModel.create({
      estudianteId,
      tutorId,
      fecha: fechaDate,
      materia,
      tema,
      observaciones: observaciones ?? null,
      duracion,
      estado: estado ?? "completada",
    });

    return res.status(201).json({ message: "Tutoría creada", tutoria });
  } catch (err) {
    console.error("Error en create tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/tutorias
 * Listar todas (con filtros opcionales)
 * Filtros por query params (opcionales):
 * - estudianteId
 * - tutorId
 * - estado
 * - materia (contiene)
 * - desde (fecha)
 * - hasta (fecha)
 */
export const getAll = async (req, res) => {
  try {
    const { estudianteId, tutorId, estado, materia, desde, hasta } = req.query;

    const where = {};

    if (estudianteId) where.estudianteId = estudianteId;
    if (tutorId) where.tutorId = tutorId;
    if (estado) where.estado = estado;

    if (materia) {
      where.materia = { [Op.like]: `%${materia}%` };
    }

    // rango de fechas opcional
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }

    const tutorias = await TutoriaModel.findAll({
      where,
      order: [["fecha", "DESC"]],
    });

    return res.json({ tutorias });
  } catch (err) {
    console.error("Error en getAll tutorias:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/tutorias/:id
 * Obtener una específica
 */
export const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const tutoria = await TutoriaModel.findByPk(id);

    if (!tutoria) {
      return res.status(404).json({ message: "Tutoría no encontrada" });
    }

    return res.json({ tutoria });
  } catch (err) {
    console.error("Error en getById tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * PUT /api/tutorias/:id
 * Actualizar tutoría
 * (Actualización parcial: solo cambia lo que envíes)
 */
export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const tutoria = await TutoriaModel.findByPk(id);
    if (!tutoria) {
      return res.status(404).json({ message: "Tutoría no encontrada" });
    }

    const {
      fecha,
      materia,
      tema,
      observaciones,
      duracion,
      estado,
      estudianteId,
      tutorId,
    } = req.body;

    if (fecha !== undefined) {
      const fechaDate = new Date(fecha);
      if (Number.isNaN(fechaDate.getTime())) {
        return res.status(400).json({ message: "Fecha inválida" });
      }
      tutoria.fecha = fechaDate;
    }

    if (materia !== undefined) tutoria.materia = materia;
    if (tema !== undefined) tutoria.tema = tema;
    if (observaciones !== undefined) tutoria.observaciones = observaciones;
    if (duracion !== undefined) tutoria.duracion = duracion;
    if (estado !== undefined) tutoria.estado = estado;

    // si quieres permitir cambiar relaciones (opcional)
    if (estudianteId !== undefined) tutoria.estudianteId = estudianteId;
    if (tutorId !== undefined) tutoria.tutorId = tutorId;

    await tutoria.save();

    return res.json({ message: "Tutoría actualizada", tutoria });
  } catch (err) {
    console.error("Error en update tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * DELETE /api/tutorias/:id
 * Eliminar tutoría
 */
export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const tutoria = await TutoriaModel.findByPk(id);
    if (!tutoria) {
      return res.status(404).json({ message: "Tutoría no encontrada" });
    }

    await tutoria.destroy();
    return res.json({ message: "Tutoría eliminada" });
  } catch (err) {
    console.error("Error en delete tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/tutorias/estudiante/:estudianteId
 * Tutorías de un estudiante
 */
export const getByEstudiante = async (req, res) => {
  try {
    const { estudianteId } = req.params;

    const tutorias = await TutoriaModel.findAll({
      where: { estudianteId },
      order: [["fecha", "DESC"]],
    });

    return res.json({ tutorias });
  } catch (err) {
    console.error("Error en getByEstudiante:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/tutorias/tutor/:tutorId
 * Tutorías de un tutor
 */
export const getByTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;

    const tutorias = await TutoriaModel.findAll({
      where: { tutorId },
      order: [["fecha", "DESC"]],
    });

    return res.json({ tutorias });
  } catch (err) {
    console.error("Error en getByTutor:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/tutorias/rango?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Filtrar por rango de fechas
 */
export const getByDateRange = async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      return res.status(400).json({ message: "Debe enviar desde y hasta" });
    }

    const d1 = new Date(desde);
    const d2 = new Date(hasta);

    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
      return res.status(400).json({ message: "Rango de fechas inválido" });
    }

    const tutorias = await TutoriaModel.findAll({
      where: {
        fecha: {
          [Op.between]: [d1, d2],
        },
      },
      order: [["fecha", "DESC"]],
    });

    return res.json({ tutorias });
  } catch (err) {
    console.error("Error en getByDateRange:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};
