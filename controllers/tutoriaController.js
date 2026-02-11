import { Op } from "sequelize";
import { TutoriaModel } from "../models/Tutoria.js";
import { InscripcionModel } from "../models/Inscripcion.js";
import { EstudianteModel } from "../models/Estudiante.js";
import { TutorModel } from "../models/Tutor.js";
import { UserModel } from "../models/User.js";
import { sequelize } from "../Db/conexion.js";

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

    // ✅ filtros vienen del frontend por query params
    // /api/tutorias?materia=...&estado=...&q=...
    const { materia, estado, q } = req.query;

    const where = {};

    if (materia && materia !== "Todos" && materia !== "todas" && materia !== "todas las materias") {
      where.materia = materia;
    }

    if (estado && estado !== "Todos" && estado !== "todas" && estado !== "todos") {
      where.estado = estado;
    }

    if (q && String(q).trim().length > 0) {
      where[Op.or] = [
        { tema: { [Op.like]: `%${q}%` } },
        { materia: { [Op.like]: `%${q}%` } },
      ];
    }

    // Admin ve todas (con filtros)
    if (rol === "admin") {
      const tutorias = await TutoriaModel.findAll({
        where,
        order: [["fecha", "DESC"]],
      });
      return res.json({ tutorias });
    }

    // Tutor ve solo las suyas (con filtros)
    if (rol === "tutor") {
      const tutor = await TutorModel.findOne({ where: { userId } });
      if (!tutor) {
        return res.status(403).json({ message: "Solo tutores pueden ver sus tutorías" });
      }

      where.tutorId = tutor.id;

      const tutorias = await TutoriaModel.findAll({
        where,
        order: [["fecha", "DESC"]],
      });

      return res.json({ tutorias });
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (err) {
    console.error("❌ Error en getAll tutorias:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * export const update
 * PUT /api/tutorias/:id
 * Actualizar tutoría
 */
export const update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const rol = req.user?.rol;
    const userId = req.user?.id;

    if (!rol || !userId) {
      await t.rollback();
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tutoria = await TutoriaModel.findByPk(id, { transaction: t });
    if (!tutoria) {
      await t.rollback();
      return res.status(404).json({ message: "Tutoría no encontrada" });
    }

    // ✅ Si es tutor, solo puede editar sus tutorías
    if (rol === "tutor") {
      const tutor = await TutorModel.findOne({ where: { userId }, transaction: t });
      if (!tutor) {
        await t.rollback();
        return res.status(403).json({ message: "Solo tutores pueden actualizar tutorías" });
      }
      if (tutoria.tutorId !== tutor.id) {
        await t.rollback();
        return res.status(403).json({ message: "No puedes editar tutorías de otro tutor" });
      }
    }

    // 🚫 Bloquear cambios peligrosos aunque vengan en el body
    if (req.body?.tutorId !== undefined) {
      await t.rollback();
      return res.status(400).json({ message: "No se permite cambiar tutorId" });
    }
    if (req.body?.id !== undefined) {
      await t.rollback();
      return res.status(400).json({ message: "No se permite cambiar id" });
    }

    const estadoActual = tutoria.estado;

    // ✅ Restricciones por estado actual
    // - en_curso: solo descripcion y estado
    // - completada: solo descripcion
    const allowOnlyDescripcion =
      estadoActual === "completada";

    const allowOnlyDescripcionYEstado =
      estadoActual === "en_curso";

    if (allowOnlyDescripcion) {
      const keys = Object.keys(req.body || {});
      const allowed = ["descripcion"];
      const invalid = keys.filter((k) => !allowed.includes(k));
      if (invalid.length > 0) {
        await t.rollback();
        return res.status(400).json({
          message: `Tutoría completada: solo puedes editar 'descripcion'. Campos no permitidos: ${invalid.join(", ")}`
        });
      }
    }

    if (allowOnlyDescripcionYEstado) {
      const keys = Object.keys(req.body || {});
      const allowed = ["descripcion", "estado"];
      const invalid = keys.filter((k) => !allowed.includes(k));
      if (invalid.length > 0) {
        await t.rollback();
        return res.status(400).json({
          message: `Tutoría en curso: solo puedes editar 'descripcion' y 'estado'. Campos no permitidos: ${invalid.join(", ")}`
        });
      }
    }

    // Campos permitidos
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

    // Validar y aplicar
    if (descripcion !== undefined) tutoria.descripcion = descripcion;

    if (!allowOnlyDescripcion && !allowOnlyDescripcionYEstado) {
      if (fecha !== undefined) {
        const fechaDate = new Date(fecha);
        if (Number.isNaN(fechaDate.getTime())) {
          await t.rollback();
          return res.status(400).json({ message: "Fecha inválida" });
        }
        tutoria.fecha = fechaDate;
      }

      if (materia !== undefined) tutoria.materia = materia;
      if (tema !== undefined) tutoria.tema = tema;

      if (duracion !== undefined) {
        const d = Number(duracion);
        if (!Number.isInteger(d) || d <= 0) {
          await t.rollback();
          return res.status(400).json({ message: "Duración inválida" });
        }
        tutoria.duracion = d;
      }

      if (modalidad !== undefined) {
        const allowed = ["presencial", "virtual", "hibrida"];
        if (!allowed.includes(modalidad)) {
          await t.rollback();
          return res.status(400).json({ message: "Modalidad inválida" });
        }
        tutoria.modalidad = modalidad;
      }

      if (ubicacion !== undefined) tutoria.ubicacion = ubicacion;

      if (cupoMaximo !== undefined) {
        const c = Number(cupoMaximo);
        if (!Number.isInteger(c) || c <= 0) {
          await t.rollback();
          return res.status(400).json({ message: "cupoMaximo inválido" });
        }

        // ✅ No bajar cupo por debajo de inscritos
        const inscritos = await InscripcionModel.count({
          where: { tutoriaId: tutoria.id },
          transaction: t,
        });

        if (c < inscritos) {
          await t.rollback();
          return res.status(400).json({
            message: `No puedes bajar el cupo a ${c} porque ya hay ${inscritos} inscritos`
          });
        }

        tutoria.cupoMaximo = c;
      }
    }

    // Estado: permitido si NO está completada.
    // - programada: puede cambiar
    // - en_curso: puede cambiar (por regla allowOnlyDescripcionYEstado)
    // - completada: NO (solo descripcion)
    if (estado !== undefined) {
      if (estadoActual === "completada") {
        await t.rollback();
        return res.status(400).json({ message: "Tutoría completada: no puedes cambiar el estado" });
      }
      const allowed = ["programada", "en_curso", "completada", "cancelada"];
      if (!allowed.includes(estado)) {
        await t.rollback();
        return res.status(400).json({ message: "Estado inválido" });
      }
      tutoria.estado = estado;
    }

    await tutoria.save({ transaction: t });
    await t.commit();

    return res.json({ message: "Tutoría actualizada", tutoria });
  } catch (err) {
    await t.rollback();
    console.error("❌ Error en update tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};


/**
 * export const remove
 * DELETE /api/tutorias/:id
 * Eliminar tutoría (y todas sus inscripciones en cascada)
 */
export const remove = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const rol = req.user?.rol;
    const userId = req.user?.id;

    if (!rol || !userId) {
      await t.rollback();
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tutoria = await TutoriaModel.findByPk(id, { transaction: t });
    if (!tutoria) {
      await t.rollback();
      return res.status(404).json({ message: "Tutoría no encontrada" });
    }

    // ✅ Si es tutor, solo puede eliminar sus tutorías
    if (rol === "tutor") {
      const tutor = await TutorModel.findOne({ where: { userId }, transaction: t });
      if (!tutor) {
        await t.rollback();
        return res.status(403).json({ message: "Solo tutores pueden eliminar tutorías" });
      }
      if (tutoria.tutorId !== tutor.id) {
        await t.rollback();
        return res.status(403).json({ message: "No puedes eliminar tutorías de otro tutor" });
      }
    }

    // 🚫 No permitir borrar si ya está en curso o completada
    if (["en_curso", "completada"].includes(tutoria.estado)) {
      await t.rollback();
      return res.status(400).json({
        message: `No se puede eliminar una tutoría en estado '${tutoria.estado}'. Cancélala si es necesario.`,
      });
    }

    // 🚫 No permitir borrar si ya tiene inscritos
    const inscritos = await InscripcionModel.count({
      where: { tutoriaId: tutoria.id },
      transaction: t,
    });

    if (inscritos > 0) {
      await t.rollback();
      return res.status(400).json({
        message: `No se puede eliminar: la tutoría tiene ${inscritos} inscrito(s). Cancélala en lugar de eliminar.`,
      });
    }

    await tutoria.destroy({ transaction: t });
    await t.commit();

    return res.json({ message: "Tutoría eliminada" });
  } catch (err) {
    await t.rollback();
    console.error("❌ Error en remove tutoria:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

/**
 * export const getDisponibles
 * GET /api/tutorias/disponibles
 * Listar tutorías disponibles (programadas y con cupo)
 */
// GET /api/tutorias/disponibles
// Devuelve tutorías abiertas para estudiantes (estado="programada" y cupo disponible)
export const getDisponibles = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const userId = req.user?.id;

    if (rol !== "estudiante") {
      return res.status(403).json({ message: "Solo estudiantes pueden ver tutorías disponibles" });
    }

    const where = { estado: "programada" }; // solo tutorías activas
    const tutorias = await TutoriaModel.findAll({
      where,
      order: [["fecha", "ASC"]],
    });

    return res.json({ tutorias });
  } catch (err) {
    console.error("❌ Error getDisponibles:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};
