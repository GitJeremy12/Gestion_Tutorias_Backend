const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

const isIntLike = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
};

const isValidDate = (v) => {
  // Acepta ISO o formatos que Date pueda parsear
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
};

const normalizeEmail = (email) => email.trim().toLowerCase();

// POST /api/login
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  req.body.email = normalizeEmail(email);
  return next();
};

// POST /api/register
export const validateRegister = (req, res, next) => {
  const {
    email,
    password,
    nombre,
    rol,
    // estudiante
    matricula,
    carrera,
    semestre,
    telefono,
    // tutor
    especialidad,
    departamento,
    disponibilidad,
  } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(nombre) || !isNonEmptyString(rol)) {
    return res.status(400).json({ message: "Datos incompletos" });
  }

  const rolesValidos = ["admin", "tutor", "estudiante"];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ message: "Rol inválido" });
  }

  // Normaliza email
  req.body.email = normalizeEmail(email);

  // Password mínimo (ajusta si tu CA pide otra cosa)
  if (password.length < 6) {
    return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
  }

  if (rol === "estudiante") {
    if (!isNonEmptyString(matricula) || !isNonEmptyString(carrera) || semestre === undefined || semestre === null) {
      return res.status(400).json({ message: "Datos de estudiante incompletos" });
    }
    // semestre debe ser entero 1..12
    const sem = Number(semestre);
    if (!Number.isInteger(sem) || sem < 1 || sem > 12) {
      return res.status(400).json({ message: "Semestre inválido" });
    }
    // teléfono opcional
    if (telefono !== undefined && telefono !== null && !isNonEmptyString(telefono)) {
      return res.status(400).json({ message: "Teléfono inválido" });
    }
  }

  if (rol === "tutor") {
    if (!isNonEmptyString(especialidad) || !isNonEmptyString(departamento)) {
      return res.status(400).json({ message: "Datos de tutor incompletos" });
    }

    // disponibilidad opcional: si viene, debe ser objeto (no string JSON)
    if (disponibilidad !== undefined && disponibilidad !== null) {
      const isObject = typeof disponibilidad === "object" && !Array.isArray(disponibilidad);
      if (!isObject) {
        return res.status(400).json({ message: "Disponibilidad debe ser un objeto (no string)" });
      }
    }
  }

  return next();
};

// POST /api/agendamientos
export const validateCreateAgendamiento = (req, res, next) => {
  const { tutorId, fechaProgramada, materia } = req.body;

  // En tu controller normalmente el estudianteId lo sacas del token (req.user.id -> perfil)
  // por eso aquí validamos tutorId/fecha/materia
  if (!isIntLike(tutorId)) {
    return res.status(400).json({ message: "tutorId es requerido y debe ser entero" });
  }

  if (!fechaProgramada || !isValidDate(fechaProgramada)) {
    return res.status(400).json({ message: "fechaProgramada es requerida y debe ser una fecha válida" });
  }

  if (!isNonEmptyString(materia)) {
    return res.status(400).json({ message: "materia es requerida" });
  }

  return next();
};
