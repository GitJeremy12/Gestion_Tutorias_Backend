import { UserModel } from "./User.js";
import { EstudianteModel } from "./Estudiante.js";
import { TutorModel } from "./Tutor.js";
import { TutoriaModel } from "./Tutoria.js";
import { InscripcionModel } from "./Inscripcion.js";


export const definirRelaciones = () => {
  EstudianteModel.belongsTo(UserModel, { foreignKey: "userId" });
  UserModel.hasOne(EstudianteModel, { foreignKey: "userId" });

  TutorModel.belongsTo(UserModel, { foreignKey: "userId" });
  UserModel.hasOne(TutorModel, { foreignKey: "userId" });

  TutorModel.hasMany(TutoriaModel, { 
    foreignKey: "tutorId",
    as: "tutorias" 
  });
  TutoriaModel.belongsTo(TutorModel, { 
    foreignKey: "tutorId",
    as: "tutor" 
  });

  EstudianteModel.belongsToMany(TutoriaModel, {
    through: InscripcionModel,
    foreignKey: "estudianteId",
    otherKey: "tutoriaId",
    as: "tutoriasInscritas",
  });

  TutoriaModel.belongsToMany(EstudianteModel, {
    through: InscripcionModel,
    foreignKey: "tutoriaId",
    otherKey: "estudianteId",
    as: "estudiantesInscritos",
  });

  InscripcionModel.belongsTo(TutoriaModel, { 
    foreignKey: "tutoriaId",
    as: "tutoria" 
  });
  InscripcionModel.belongsTo(EstudianteModel, { 
    foreignKey: "estudianteId",
    as: "estudiante" 
  });

  TutoriaModel.hasMany(InscripcionModel, { 
    foreignKey: "tutoriaId",
    as: "inscripciones" 
  });
  EstudianteModel.hasMany(InscripcionModel, { 
    foreignKey: "estudianteId",
    as: "inscripciones" 
  });

};