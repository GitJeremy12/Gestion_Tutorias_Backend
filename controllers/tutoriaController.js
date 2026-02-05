import { Op } from "sequelize";
import { TutoriaModel } from "../models/Tutoria.js";
import { InscripcionModel } from "../models/Inscripcion.js";
import { EstudianteModel } from "../models/Estudiante.js";
import { TutorModel } from "../models/Tutor.js";
import { UserModel } from "../models/User.js";

/**
 * POST /api/tutorias
 * Crear nueva tutoría (sesión grupal)
 */
export const create = async (req, res) => {
  try {
    const {
      tutorId,
      fecha,
      materia,
      tema,
      descripcion,
      duracion,
      cupoMaximo,
      modalidad,
      ubicacion,
      estado,
    } = req.body;

    // Validaciones
    if (!tutorId || !fecha || !materia || !tema || !duracion) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const fechaDate = new Date(fecha);
    if (Number.isNaN(fechaDate.getTime())) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    // Verificar que el tutor existe
    const tutor = await TutorModel.findByPk(tutorId);
    if (!tutor) {
      return res.status(404).json({ message: "Tutor no encontrado" });
    }

    const tutoria = await TutoriaModel.create({
      tutorId,
      fecha: fechaDate,
      materia,
      tema,
      descripcion: descripcion ?? null,
      duracion,
      cupoMaximo: cupoMaximo ?? 10,
      modalidad: modalidad ?? "presencial",
      ubicacion: ubicacion ?? null,
      estado: estado ?? "programada",
    });

    return res.status(201).json({ message: "Tutoría creada", tutoria });
  } catch (err) {
    console.error("Error en create tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

// GET /api/tutorias
// - tutor: devuelve SOLO sus tutorías
// - admin: devuelve TODAS (opcional, pero útil)
export const getAll = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;

    if (!rol || !userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Admin ve todas
    if (rol === "admin") {
      const tutorias = await TutoriaModel.findAll({
        order: [["fecha", "DESC"]],
      });
      return res.json({ tutorias });
    }

    // Tutor ve solo las suyas
    if (rol === "tutor") {
      const tutor = await TutorModel.findOne({ where: { userId } });
      if (!tutor) {
        return res.status(403).json({ message: "Solo tutores pueden ver sus tutorías" });
      }

      const tutorias = await TutoriaModel.findAll({
        where: { tutorId: tutor.id },
        order: [["fecha", "DESC"]],
      });

      return res.json({ tutorias });
    }

    // Estudiante no
    return res.status(403).json({ message: "Forbidden" });
  } catch (err) {
    console.error("❌ Error en getAll tutorias:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};


/**
 * export const getById
 * GET /api/tutorias/:id
 * Obtener tutoría con todos sus inscritos
 */


/**
 * export const update
 * PUT /api/tutorias/:id
 * Actualizar tutoría
 */


/**
 * export const remove
 * DELETE /api/tutorias/:id
 * Eliminar tutoría (y todas sus inscripciones en cascada)
 */


/**
 * export const getByTutor
 * GET /api/tutorias/tutor/:tutorId
 * Tutorías de un tutor
 */


/**
 * export const getDisponibles
 * GET /api/tutorias/disponibles
 * Listar tutorías disponibles (programadas y con cupo)
 */
