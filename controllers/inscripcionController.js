import { InscripcionModel } from "../models/Inscripcion.js";
import { TutoriaModel } from "../models/Tutoria.js";
import { EstudianteModel } from "../models/Estudiante.js";
import { TutorModel } from "../models/Tutor.js";
import { UserModel } from "../models/User.js";
import { sendAgendamientoConfirmacion } from "../services/emailServices.js";

/**
 * POST /api/inscripciones
 * Inscribir estudiante a una tutoría
 */
/**
 * POST /api/inscripciones
 * Inscribir estudiante a una tutoría
 */
/**
 * POST /api/inscripciones
 * Inscribir estudiante a una tutoría
 */
export const inscribir = async (req, res) => {
  try {
    const { tutoriaId } = req.body;
    const userId = req.user?.id; // 👈 SALE DEL TOKEN

    if (!tutoriaId || !userId) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    // 🔎 Buscar estudiante asociado al usuario logueado
    const estudiante = await EstudianteModel.findOne({
      where: { userId },
    });

    if (!estudiante) {
      return res
        .status(403)
        .json({ message: "Solo estudiantes pueden inscribirse" });
    }

    const estudianteId = estudiante.id;

    // 🔎 Buscar tutoría con inscripciones
    const tutoria = await TutoriaModel.findByPk(tutoriaId, {
      include: [
        {
          model: InscripcionModel,
          as: "inscripciones",
        },
      ],
    });

    if (!tutoria) {
      return res.status(404).json({ message: "Tutoría no encontrada" });
    }

    if (tutoria.estado !== "programada") {
      return res.status(400).json({
        message: "La tutoría no está disponible para inscripciones",
      });
    }

    const inscritosActuales = tutoria.inscripciones?.length || 0;

    if (inscritosActuales >= tutoria.cupoMaximo) {
      return res.status(400).json({ message: "No hay cupos disponibles" });
    }

    // ❌ Evitar doble inscripción
    const yaInscrito = await InscripcionModel.findOne({
      where: { tutoriaId, estudianteId },
    });

    if (yaInscrito) {
      return res.status(409).json({
        message: "El estudiante ya está inscrito en esta tutoría",
      });
    }

    // ✅ Crear inscripción
    const inscripcion = await InscripcionModel.create({
      tutoriaId,
      estudianteId,
      asistencia: "pendiente",
    });

    // 📧 Enviar email (NO rompe si falla)
    try {
      const usuario = await UserModel.findByPk(userId);

      const tutor = await TutorModel.findByPk(tutoria.tutorId, {
        include: [
          {
            model: UserModel,
            attributes: ["nombre", "email"],
          },
        ],
      });

      await sendAgendamientoConfirmacion({
        to: usuario.email,
        nombre: usuario.nombre,
        materia: tutoria.materia,
        tema: tutoria.tema,
        descripcion: tutoria.descripcion,
        fecha: tutoria.fecha,
        duracion: tutoria.duracion,
        modalidad: tutoria.modalidad,
        ubicacion: tutoria.ubicacion,
        tutorNombre: tutor?.User?.nombre || "Tutor",
        cuposDisponibles: tutoria.cupoMaximo - (inscritosActuales + 1),
        cupoMaximo: tutoria.cupoMaximo,
      });
    } catch (emailError) {
      console.error("⚠️ Error al enviar email:", emailError);
    }

    return res.status(201).json({
      message: "Inscripción exitosa",
      inscripcion,
    });
  } catch (err) {
    console.error("❌ Error en inscribir:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Ya existe una inscripción para este estudiante",
      });
    }

    return res.status(500).json({ message: "Error interno" });
  }
};
/**
 * GET /api/inscripciones/tutoria/:tutoriaId
 * Ver todos los inscritos de una tutoría
 */
export const getByTutoria = async (req, res) => {
  try {
    const { tutoriaId } = req.params;

    const inscripciones = await InscripcionModel.findAll({
      where: { tutoriaId },
      include: [
        {
          model: EstudianteModel,
          as: "estudiante",
          include: [
            {
              model: UserModel,
              attributes: ["nombre", "email", "id"],
            },
          ],
        },
      ],
      order: [["fechaInscripcion", "ASC"]],
    });

    return res.json({ inscripciones });
  } catch (err) {
    console.error("Error en getByTutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/inscripciones/estudiante/:estudianteId
 * Ver todas las inscripciones de un estudiante
 */
export const getByEstudiante = async (req, res) => {
  try {
    const { estudianteId } = req.params;

    const inscripciones = await InscripcionModel.findAll({
      where: { estudianteId },
      include: [
        {
          model: TutoriaModel,
          as: "tutoria",
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
          ],
        },
      ],
      order: [["fechaInscripcion", "DESC"]],
    });

    return res.json({ inscripciones });
  } catch (err) {
    console.error("Error en getByEstudiante:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * PUT /api/inscripciones/:id/asistencia
 * Registrar asistencia de un estudiante
 */
export const registrarAsistencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { asistencia } = req.body;

    if (!asistencia || !["asistio", "falta", "justificada"].includes(asistencia)) {
      return res.status(400).json({ 
        message: "Asistencia inválida. Valores: asistio, falta, justificada" 
      });
    }

    const inscripcion = await InscripcionModel.findByPk(id);
    if (!inscripcion) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }

    inscripcion.asistencia = asistencia;
    await inscripcion.save();

    return res.json({ 
      message: "Asistencia registrada", 
      inscripcion 
    });
  } catch (err) {
    console.error("Error en registrarAsistencia:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * PUT /api/inscripciones/:id/calificar
 * Calificar tutoría (por el estudiante)
 */
export const calificar = async (req, res) => {
  try {
    const { id } = req.params;
    const { calificacion, comentario } = req.body;

    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ 
        message: "Calificación debe ser entre 1 y 5" 
      });
    }

    const inscripcion = await InscripcionModel.findByPk(id);
    if (!inscripcion) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }

    inscripcion.calificacion = calificacion;
    if (comentario) {
      inscripcion.comentario = comentario;
    }
    await inscripcion.save();

    return res.json({ 
      message: "Calificación guardada", 
      inscripcion 
    });
  } catch (err) {
    console.error("Error en calificar:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * DELETE /api/inscripciones/:id
 * Cancelar inscripción (desinscribirse)
 */
export const cancelar = async (req, res) => {
  try {
    const { id } = req.params;

    const inscripcion = await InscripcionModel.findByPk(id, {
      include: [
        {
          model: TutoriaModel,
          as: "tutoria",
        },
      ],
    });

    if (!inscripcion) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }

    // Validar que la tutoría no haya iniciado
    if (inscripcion.tutoria.estado !== "programada") {
      return res.status(400).json({ 
        message: "No se puede cancelar, la tutoría ya inició o finalizó" 
      });
    }

    await inscripcion.destroy();
    return res.json({ message: "Inscripción cancelada" });
  } catch (err) {
    console.error("Error en cancelar:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * GET /api/inscripciones
 * Listar todas las inscripciones (admin)
 */
export const getAll = async (req, res) => {
  try {
    const inscripciones = await InscripcionModel.findAll({
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
        {
          model: TutoriaModel,
          as: "tutoria",
          include: [
            {
              model: TutorModel,
              as: "tutor",
              include: [
                {
                  model: UserModel,
                  attributes: ["nombre"],
                },
              ],
            },
          ],
        },
      ],
      order: [["fechaInscripcion", "DESC"]],
    });

    return res.json({ inscripciones });
  } catch (err) {
    console.error("Error en getAll inscripciones:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};