import { DataTypes } from "sequelize";
import { sequelize } from "../Db/conexion.js";

export const EstudianteModel = sequelize.define(
  "estudiantes",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    matricula: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
    },
    carrera: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    semestre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },
    telefono: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);
