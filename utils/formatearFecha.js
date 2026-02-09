export const formatearFecha = (fecha) => {
  const opciones = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guayaquil',
  };
  
  return new Date(fecha).toLocaleDateString('es-EC', opciones);
};

export const formatearDuracion = (minutos) => {
  if (minutos < 60) {
    return `${minutos} minutos`;
  }
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas} hora${horas > 1 ? 's' : ''}`;
};
