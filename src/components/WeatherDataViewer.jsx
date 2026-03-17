import React from 'react';


function renderValue(value) {
  if (typeof value === 'object' && value !== null) {
    return <WeatherDataViewer data={value} nested={true} />;
  }
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }
  return value;
}
import { WEATHER_LABELS } from './weatherLabels';

export default function WeatherDataViewer({ data, nested }) {
  if (!data || typeof data !== 'object') return null;
  const entries = Object.entries(data).filter(([_, value]) => value !== null && value !== undefined);
  if (entries.length === 0) return <span style={{color: 'var(--text-muted)', fontStyle: 'italic'}}>Sin datos</span>;

  // Agrupar en filas de 4 columnas
  // (no se usa rows, pero se deja por si se quiere agrupar visualmente en el futuro)

  return (
    <div
      className="weather-data-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem 1.5rem',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '8px 0',
        margin: nested ? 0 : '8px 0',
        fontSize: nested ? '0.97em' : '1em',
        boxShadow: nested ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {entries.map(([key, value]) => {
        const labelInfo = WEATHER_LABELS[key] || {};
        const label = labelInfo.label || key;
        const unit = labelInfo.unit ? ` ${labelInfo.unit}` : '';
        return (
          <div key={key} style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '6px 0'}}>
            <span style={{color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.93em', marginBottom: 2}}>{label}</span>
            <span style={{color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.08em'}}>{renderValue(value)}{unit}</span>
          </div>
        );
      })}
    </div>
  );
}
