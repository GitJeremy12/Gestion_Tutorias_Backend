import { DataTypes } from "sequelize";
import { sequelize } from "../Db/conexion.js";

export const TutoriaModel = sequelize.define(
  "tutorias",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tutorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tutores",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    materia: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tema: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    duracion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Duración en minutos",
    },
    cupoMaximo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: "Número máximo de estudiantes",
    },
    modalidad: {
      type: DataTypes.ENUM("presencial", "virtual", "hibrida"),
      allowNull: false,
      defaultValue: "presencial",
    },
    ubicacion: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: "Salón o enlace de videoconferencia",
    },
    estado: {
      type: DataTypes.ENUM("programada", "en_curso", "completada", "cancelada"),
      allowNull: false,
      defaultValue: "programada",
    },
  },
  {
    timestamps: true,
  }
);