import "dotenv/config";
import express from 'express';
import cors from 'cors';
import { PORT } from './config/config.js';
import { sequelize } from './Db/conexion.js';
import './models/User.js';
import './models/Estudiante.js';
import './models/Tutor.js';
import './models/Tutoria.js';
import './models/Agendamiento.js';
import { definirRelaciones } from "./models/Relaciones.js";
import authRoutes from './routes/auth.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import agendamientosRoutes from "./routes/agendamientos.routes.js";
import tutoriasRoutes from "./routes/tutorias.routes.js";

const app = express();
app.use(express.json());
app.use(cors());

// Rutas de autenticación
app.use('/api', authRoutes);
app.use("/api", agendamientosRoutes);
app.use("/api", tutoriasRoutes);

app.use(errorHandler);

const main = async () => {
  try {
    definirRelaciones();
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');

    // Solo en desarrollo
    await sequelize.sync({ alter: false });

    app.listen(PORT, () => {
      console.log(`🚀 Servidor Express ejecutando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  }
};
main();
export default app; // útil para tests después
