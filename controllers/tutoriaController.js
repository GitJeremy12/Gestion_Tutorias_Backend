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

/**
 * GET /api/tutorias
 * Listar todas con información de inscritos
 */
export const getAll = async (req, res) => {
  try {
    const { tutorId, estado, materia, desde, hasta, modalidad } = req.query;

    const where = {};

    if (tutorId) where.tutorId = tutorId;
    if (estado) where.estado = estado;
    if (modalidad) where.modalidad = modalidad;

    if (materia) {
      where.materia = { [Op.like]: `%${materia}%` };
    }

    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }

    const tutorias = await TutoriaModel.findAll({
      where,
      include: [
        {
          model: TutorModel,
          as: "tutor",
          include: [
            {
              model: UserModel,
              attributes: ["nombre", "email"],
            },
          ],
        },
        {
          model: InscripcionModel,
          as: "inscripciones",
          include: [
            {
              model: EstudianteModel,
              as: "estudiante",
              include: [
                {
                  model: UserModel,
                  attributes: ["nombre", "email"],
                },
              ],
            },
          ],
        },
      ],
      order: [["fecha", "DESC"]],
    });

    // Agregar conteo de inscritos
    const tutoriasConInfo = tutorias.map((t) => ({
      ...t.toJSON(),
      estudiantesInscritos: t.inscripciones?.length || 0,
      cuposDisponibles: t.cupoMaximo - (t.inscripciones?.length || 0),
    }));

    return res.json({ tutorias: tutoriasConInfo });
  } catch (err) {
    console.error("Error en getAll tutorias:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/tutorias/:id
 * Obtener tutoría con todos sus inscritos
 */
export const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const tutoria = await TutoriaModel.findByPk(id, {
      include: [
        {
          model: TutorModel,
          as: "tutor",
          include: [
            {
              model: UserModel,
              attributes: ["nombre", "email", "id"],
            },
          ],
        },
        {
          model: InscripcionModel,
          as: "inscripciones",
          include: [
            {
              model: EstudianteModel,
              as: "estudiante",
              include: [
                {
                  model: UserModel,
                  attributes: ["nombre", "email"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!tutoria) {
      return res.status(404).json({ message: "Tutoría no encontrada" });
    }

    const tutoriaInfo = {
      ...tutoria.toJSON(),
      estudiantesInscritos: tutoria.inscripciones?.length || 0,
      cuposDisponibles: tutoria.cupoMaximo - (tutoria.inscripciones?.length || 0),
    };

    return res.json({ tutoria: tutoriaInfo });
  } catch (err) {
    console.error("Error en getById tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * PUT /api/tutorias/:id
 * Actualizar tutoría
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
      descripcion,
      duracion,
      cupoMaximo,
      modalidad,
      ubicacion,
      estado,
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
    if (descripcion !== undefined) tutoria.descripcion = descripcion;
    if (duracion !== undefined) tutoria.duracion = duracion;
    if (cupoMaximo !== undefined) tutoria.cupoMaximo = cupoMaximo;
    if (modalidad !== undefined) tutoria.modalidad = modalidad;
    if (ubicacion !== undefined) tutoria.ubicacion = ubicacion;
    if (estado !== undefined) tutoria.estado = estado;

    await tutoria.save();

    return res.json({ message: "Tutoría actualizada", tutoria });
  } catch (err) {
    console.error("Error en update tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * DELETE /api/tutorias/:id
 * Eliminar tutoría (y todas sus inscripciones en cascada)
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
 * GET /api/tutorias/tutor/:tutorId
 * Tutorías de un tutor
 */
export const getByTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;

    const tutorias = await TutoriaModel.findAll({
      where: { tutorId },
      include: [
        {
          model: InscripcionModel,
          as: "inscripciones",
          include: [
            {
              model: EstudianteModel,
              as: "estudiante",
              include: [
                {
                  model: UserModel,
                  attributes: ["nombre", "email"],
                },
              ],
            },
          ],
        },
      ],
      order: [["fecha", "DESC"]],
    });

    const tutoriasConInfo = tutorias.map((t) => ({
      ...t.toJSON(),
      estudiantesInscritos: t.inscripciones?.length || 0,
      cuposDisponibles: t.cupoMaximo - (t.inscripciones?.length || 0),
    }));

    return res.json({ tutorias: tutoriasConInfo });
  } catch (err) {
    console.error("Error en getByTutor:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/tutorias/disponibles
 * Listar tutorías disponibles (programadas y con cupo)
 */
export const getDisponibles = async (req, res) => {
  try {
    const tutorias = await TutoriaModel.findAll({
      where: {
        estado: "programada",
        fecha: {
          [Op.gte]: new Date(), // Solo futuras
        },
      },
      include: [
        {
          model: TutorModel,
          as: "tutor",
          include: [
            {
              model: UserModel,
              attributes: ["nombre", "email"],
            },
          ],
        },
        {
          model: InscripcionModel,
          as: "inscripciones",
        },
      ],
      order: [["fecha", "ASC"]],
    });

    // Filtrar solo las que tienen cupo disponible
    const tutoriasDisponibles = tutorias
      .filter((t) => {
        const inscritos = t.inscripciones?.length || 0;
        return inscritos < t.cupoMaximo;
      })
      .map((t) => ({
        ...t.toJSON(),
        estudiantesInscritos: t.inscripciones?.length || 0,
        cuposDisponibles: t.cupoMaximo - (t.inscripciones?.length || 0),
      }));

    return res.json({ tutorias: tutoriasDisponibles });
  } catch (err) {
    console.error("Error en getDisponibles:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};