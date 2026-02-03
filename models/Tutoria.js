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
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    duracion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Duración en minutos",
    },
    estado: {
      type: DataTypes.ENUM("completada", "cancelada"),
      allowNull: false,
      defaultValue: "completada",
    },
  },
  {
    timestamps: true,
  }
);
