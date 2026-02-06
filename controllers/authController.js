import { UserModel } from "../models/User.js";
import { EstudianteModel } from "../models/Estudiante.js";
import { TutorModel } from "../models/Tutor.js";
import { sequelize } from "../Db/conexion.js"; // <-- IMPORTANTE

// POST /api/login
export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    const user = await UserModel.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Email o contraseña incorrectos" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: "Email o contraseña incorrectos" });
    }

    // (opcional) bloquear si está desactivado
    if (user.activo === false) {
      return res.status(403).json({ message: "Usuario desactivado" });
    }

    // ✅ token correcto: usa el método del modelo (ya arreglado)
    const token = user.generateAuthToken();

    return res.json({ token });
  } catch (err) {
    console.error("❌ Error en login:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

// POST /api/register
export const register = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const email = req.body.email?.trim().toLowerCase();
    const {
      password,
      nombre,
      rol,
      matricula,
      carrera,
      semestre,
      telefono,
      especialidad,
      departamento,
      disponibilidad,
    } = req.body;

    if (!email || !password || !nombre || !rol) {
      await t.rollback();
      return res.status(400).json({ message: "Datos incompletos" });
    }

    // ✅ valida por rol ANTES de crear el user
    if (rol === "estudiante") {
      if (!matricula || !carrera || semestre === undefined || semestre === null) {
        await t.rollback();
        return res.status(400).json({ message: "Datos de estudiante incompletos" });
      }
    }

    if (rol === "tutor") {
      if (!especialidad || !departamento) {
        await t.rollback();
        return res.status(400).json({ message: "Datos de tutor incompletos" });
      }
    }

    // Evitar duplicados (email)
    const exists = await UserModel.findOne({ where: { email }, transaction: t });
    if (exists) {
      await t.rollback();
      return res.status(409).json({ message: "El email ya está registrado" });
    }

    // ✅ crear user dentro de transacción
    const user = await UserModel.create(
      { email, password, nombre, rol },
      { transaction: t }
    );

    // ✅ crear perfil dentro de transacción
    if (rol === "estudiante") {
      await EstudianteModel.create(
        {
          userId: user.id,
          matricula,
          carrera,
          semestre,
          telefono: telefono ?? null,
        },
        { transaction: t }
      );
    }

    if (rol === "tutor") {
      await TutorModel.create(
        {
          userId: user.id,
          especialidad,
          departamento,
          disponibilidad: disponibilidad,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return res.status(201).json({ message: "Usuario creado" });
  } catch (err) {
    await t.rollback();

    // ✅ Errores comunes más claros
    if (err?.name === "SequelizeUniqueConstraintError") {
      // Puede ser email o matricula duplicada
      return res.status(409).json({ message: "Dato duplicado (email o matrícula)" });
    }

    if (err?.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.errors?.[0]?.message || "Datos inválidos" });
    }

    console.error("❌ Error en register:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

// GET /api/auth/profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await UserModel.findByPk(userId, {
      attributes: ["id", "email", "nombre", "rol", "activo", "createdAt", "updatedAt"],
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    let profile = null;

    if (user.rol === "estudiante") {
      profile = await EstudianteModel.findOne({
        where: { userId: user.id },
        attributes: ["id", "userId", "matricula", "carrera", "semestre", "telefono", "createdAt", "updatedAt"],
      });
    } else if (user.rol === "tutor") {
      profile = await TutorModel.findOne({
        where: { userId: user.id },
        attributes: ["id", "userId", "especialidad", "departamento", "disponibilidad", "createdAt", "updatedAt"],
      });
    }

    return res.json({ user, profile });
  } catch (err) {
    console.error("❌ Error en getProfile:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};

// PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user?.id;

    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { nombre, password, currentPassword } = req.body;

    // estudiante
    const { telefono, carrera, semestre } = req.body;

    // tutor
    const { especialidad, departamento, disponibilidad } = req.body;

    const user = await UserModel.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar campos del user
    if (nombre !== undefined) user.nombre = nombre;

    // ✅ Si cambia password, exigir currentPassword
    if (password !== undefined) {
      if (!currentPassword) {
        await t.rollback();
        return res.status(400).json({ message: "Debes enviar currentPassword para cambiar la contraseña" });
      }

      const ok = await user.comparePassword(currentPassword);
      if (!ok) {
        await t.rollback();
        return res.status(401).json({ message: "Contraseña actual incorrecta" });
      }

      user.password = password; // hook beforeUpdate lo hashea
    }

    await user.save({ transaction: t });

    // Actualizar perfil según rol
    if (user.rol === "estudiante") {
      const est = await EstudianteModel.findOne({ where: { userId: user.id }, transaction: t });

      if (est) {
        if (telefono !== undefined) est.telefono = telefono;
        if (carrera !== undefined) est.carrera = carrera;
        if (semestre !== undefined) est.semestre = semestre;
        await est.save({ transaction: t });
      }
    }

    if (user.rol === "tutor") {
      const tut = await TutorModel.findOne({ where: { userId: user.id }, transaction: t });

      if (tut) {
        if (especialidad !== undefined) tut.especialidad = especialidad;
        if (departamento !== undefined) tut.departamento = departamento;
        if (disponibilidad !== undefined) tut.disponibilidad = disponibilidad;
        await tut.save({ transaction: t });
      }
    }

    await t.commit();
    return res.json({ message: "Perfil actualizado" });
  } catch (err) {
    await t.rollback();
    console.error("❌ Error en updateProfile:", err);
    return res.status(500).json({ message: "Error interno" });
  }
};
