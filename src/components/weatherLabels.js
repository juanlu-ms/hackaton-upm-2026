// Diccionario para traducir claves meteorológicas a etiquetas legibles y unidades
export const WEATHER_LABELS = {
  altitud: { label: 'Altitud', unit: 'm' },
  fecha: { label: 'Fecha' },
  horaHrMax: { label: 'Hora Humedad Máxima' },
  horaHrMin: { label: 'Hora Humedad Mínima' },
  horatmax: { label: 'Hora Temp. Máxima' },
  horatmin: { label: 'Hora Temp. Mínima' },
  hrMax: { label: 'Humedad Máxima', unit: '%' },
  hrMedia: { label: 'Humedad Media', unit: '%' },
  hrMin: { label: 'Humedad Mínima', unit: '%' },
  indicativo: { label: 'Indicativo' },
  nombre: { label: 'Nombre' },
  prec: { label: 'Precipitación', unit: 'mm' },
  provincia: { label: 'Provincia' },
  tmax: { label: 'Temp. Máxima', unit: '°C' },
  tmed: { label: 'Temp. Media', unit: '°C' },
  tmin: { label: 'Temp. Mínima', unit: '°C' },
  // Puedes añadir más claves aquí si aparecen nuevas
};
