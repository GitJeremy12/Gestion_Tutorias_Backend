import { DataTypes } from "sequelize";
import { sequelize } from "../Db/conexion.js";

export const InscripcionModel = sequelize.define(
  "inscripciones",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tutoriaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tutorias",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    estudianteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "estudiantes",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    asistencia: {
      type: DataTypes.ENUM("pendiente", "asistio", "falta", "justificada"),
      allowNull: false,
      defaultValue: "pendiente",
    },
    calificacion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
      comment: "Calificación de 1 a 5 estrellas",
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Comentario del estudiante sobre la tutoría",
    },
    fechaInscripcion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["tutoriaId", "estudianteId"],
        name: "unique_inscripcion",
      },
    ],
  }
);