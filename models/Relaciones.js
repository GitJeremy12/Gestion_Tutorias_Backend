import { UserModel } from "./User.js";
import { EstudianteModel } from "./Estudiante.js";
import { TutorModel } from "./Tutor.js";
import { TutoriaModel } from "./Tutoria.js";
import { AgendamientoModel } from "./Agendamiento.js";

export const definirRelaciones = () => {
  // User <-> Estudiante (1-1)
  EstudianteModel.belongsTo(UserModel, { foreignKey: "userId" });
  UserModel.hasOne(EstudianteModel, { foreignKey: "userId" });

  // User <-> Tutor (1-1)
  TutorModel.belongsTo(UserModel, { foreignKey: "userId" });
  UserModel.hasOne(TutorModel, { foreignKey: "userId" });

  // Estudiante/Tutor <-> Tutoria (1-N)
  EstudianteModel.hasMany(TutoriaModel, { foreignKey: "estudianteId" });
  TutorModel.hasMany(TutoriaModel, { foreignKey: "tutorId" });
  TutoriaModel.belongsTo(EstudianteModel, { foreignKey: "estudianteId" });
  TutoriaModel.belongsTo(TutorModel, { foreignKey: "tutorId" });

  // Estudiante/Tutor <-> Agendamiento (1-N)
  EstudianteModel.hasMany(AgendamientoModel, { foreignKey: "estudianteId" });
  TutorModel.hasMany(AgendamientoModel, { foreignKey: "tutorId" });
  AgendamientoModel.belongsTo(EstudianteModel, { foreignKey: "estudianteId" });
  AgendamientoModel.belongsTo(TutorModel, { foreignKey: "tutorId" });
};