import nodemailer from "nodemailer";
import {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} from "../config/config.js";

const createTransporter = () => {
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      "Faltan variables de email en .env: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS"
    );
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465, // 465 SSL, 587 STARTTLS
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

/**
 * Envío genérico (reusable)
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: EMAIL_FROM || EMAIL_USER,
    to,
    subject,
    text,
    html,
  });
};

/**
 * Confirmación de agendamiento (HU-02)
 */
export const sendAgendamientoConfirmacion = async ({
  to,
  nombre,
  materia,
  fechaProgramada,
}) => {
  const fecha = new Date(fechaProgramada);

  const subject = "Confirmación de agendamiento de tutoría";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4;">
      <h3>Hola ${nombre ?? ""} 👋</h3>
      <p>Tu solicitud de tutoría fue registrada con éxito.</p>
      <p><b>Materia:</b> ${materia}</p>
      <p><b>Fecha:</b> ${fecha.toLocaleString()}</p>
      <p><b>Estado:</b> pendiente</p>
      <hr />
      <p style="color:#555">Este es un mensaje automático.</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
};
