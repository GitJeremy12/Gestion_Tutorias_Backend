import { DataTypes } from "sequelize";
import { sequelize } from "../Db/conexion.js";

export const AgendamientoModel = sequelize.define(
  "agendamientos",
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
    fechaProgramada: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    materia: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM("pendiente", "confirmada", "cancelada"),
      allowNull: false,
      defaultValue: "pendiente",
    },
    notificacionEnviada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  }
);
