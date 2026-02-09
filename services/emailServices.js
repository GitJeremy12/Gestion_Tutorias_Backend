
import { formatearDuracion, formatearFecha } from "../utils/formatearFecha.js";
import { sendEmail } from "../utils/sendEmail.js";
const getIconoModalidad = (modalidad) => {
  const iconos = {
    presencial: '🏫',
    virtual: '💻',
    hibrida: '🔄'
  };
  return iconos[modalidad] || '📍';
};

export const sendAgendamientoConfirmacion = async ({
  to,
  nombre,
  materia,
  tema,
  descripcion,
  fecha,
  duracion,
  modalidad,
  ubicacion,
  tutorNombre,
  cuposDisponibles,
  cupoMaximo,
}) => {
  const fechaFormateada = formatearFecha(fecha);
  const duracionFormateada = formatearDuracion(duracion);
  const iconoModalidad = getIconoModalidad(modalidad);
  const fechaInscripcion = formatearFecha(new Date());

  const subject = "✅ Confirmación de inscripción a tutoría";
  
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #1A2CA3 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                    📚 Gestión de Tutorías
                  </h1>
                </td>
              </tr>
              
              <!-- Contenido -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">
                    ¡Hola ${nombre}! 👋
                  </h2>
                  
                  <p style="margin: 0 0 25px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                    Tu inscripción a la tutoría ha sido <strong style="color: #1A2CA3;">registrada exitosamente</strong>.
                  </p>
                  
                  <!-- Detalles de la tutoría -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fc; border-radius: 8px; border-left: 4px solid #1A2CA3; margin: 25px 0;">
                    <tr>
                      <td style="padding: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #1A2CA3; font-size: 18px;">
                          📋 Detalles de la tutoría
                        </h3>
                        
                        <table width="100%" cellpadding="8" cellspacing="0">
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; width: 140px;">
                              📚 Materia:
                            </td>
                            <td style="color: #333333; font-size: 15px; font-weight: 500;">
                              ${materia}
                            </td>
                          </tr>
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 10px;">
                              📖 Tema:
                            </td>
                            <td style="color: #333333; font-size: 15px; font-weight: 500; padding-top: 10px;">
                              ${tema}
                            </td>
                          </tr>
                          ${descripcion ? `
                          <tr>
                            <td colspan="2" style="color: #666666; font-size: 14px; padding-top: 15px; line-height: 1.5;">
                              <strong>📝 Descripción:</strong><br>
                              <span style="color: #555555;">${descripcion}</span>
                            </td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 10px;">
                              👨‍🏫 Tutor:
                            </td>
                            <td style="color: #333333; font-size: 15px; font-weight: 500; padding-top: 10px;">
                              ${tutorNombre || 'Por confirmar'}
                            </td>
                          </tr>
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 10px;">
                              📅 Fecha y hora:
                            </td>
                            <td style="color: #333333; font-size: 15px; font-weight: 500; padding-top: 10px;">
                              ${fechaFormateada}
                            </td>
                          </tr>
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 10px;">
                              ⏱️ Duración:
                            </td>
                            <td style="color: #333333; font-size: 15px; font-weight: 500; padding-top: 10px;">
                              ${duracionFormateada}
                            </td>
                          </tr>
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 10px;">
                              ${iconoModalidad} Modalidad:
                            </td>
                            <td style="color: #333333; font-size: 15px; font-weight: 500; padding-top: 10px; text-transform: capitalize;">
                              ${modalidad}
                            </td>
                          </tr>
                          ${ubicacion ? `
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 10px;">
                              📍 ${modalidad === 'virtual' ? 'Enlace' : 'Ubicación'}:
                            </td>
                            <td style="color: #333333; font-size: 15px; padding-top: 10px;">
                              ${modalidad === 'virtual' ? 
                                `<a href="${ubicacion}" style="color: #667eea; text-decoration: none;">${ubicacion}</a>` : 
                                ubicacion
                              }
                            </td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 10px;">
                              👥 Cupos:
                            </td>
                            <td style="color: #333333; font-size: 15px; font-weight: 500; padding-top: 10px;">
                              ${cuposDisponibles !== undefined ? `${cuposDisponibles} disponibles de ${cupoMaximo}` : `Máximo ${cupoMaximo} estudiantes`}
                            </td>
                          </tr>
                          <tr>
                            <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 10px;">
                              🕐 Te inscribiste el:
                            </td>
                            <td style="color: #333333; font-size: 15px; font-weight: 500; padding-top: 10px;">
                              ${fechaInscripcion}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Recordatorio -->
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 25px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                      <strong>💡 Recordatorio:</strong> Asegúrate de estar presente el día de la tutoría. 
                      En caso de no poder asistir, por favor cancela tu inscripción con anticipación para que otro estudiante pueda aprovechar el cupo.
                    </p>
                  </div>
                  
                  <p style="margin: 25px 0 0 0; color: #777777; font-size: 14px; line-height: 1.6;">
                    Si tienes alguna pregunta o necesitas reprogramar, no dudes en contactarnos.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fc; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #999999; font-size: 13px; text-align: center; line-height: 1.5;">
                    Este es un mensaje automático, por favor no respondas a este correo.
                  </p>
                  <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Sistema de Gestión de Tutorías. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
};
