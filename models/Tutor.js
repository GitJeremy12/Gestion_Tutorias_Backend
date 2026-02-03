import { DataTypes } from "sequelize";
import { sequelize } from "../Db/conexion.js";

export const TutorModel = sequelize.define(
  "tutores",
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
    especialidad: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    disponibilidad: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue("disponibilidad");
        if (raw === null || raw === undefined || raw === "") return null;

        try {
          return JSON.parse(raw);
        } catch (e) {
          // Si por algún motivo en BD hay texto no-JSON, no revientes el endpoint
          return raw;
        }
      },
      set(value) {
        if (value === null || value === undefined) {
          this.setDataValue("disponibilidad", null);
          return;
        }

        // Si llega como string
        if (typeof value === "string") {
          // Si ya es JSON válido, guardarlo tal cual para evitar doble stringify
          try {
            JSON.parse(value);
            this.setDataValue("disponibilidad", value);
            return;
          } catch (e) {
            // String normal: guárdalo como JSON string
            this.setDataValue("disponibilidad", JSON.stringify(value));
            return;
          }
        }

        // Si llega como objeto/array, serializar normalmente
        this.setDataValue("disponibilidad", JSON.stringify(value));
      },
    },
  },
  {
    timestamps: true,
  }
);
