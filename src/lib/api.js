/**
 * API helpers for the hackathon external API (weather + LLM)
 * and prompt engineering utilities.
 */

const API_BASE = '/api'
const BEARER_TOKEN = import.meta.env.VITE_BEARER_TOKEN || ''
export const WEATHER_DISASTER_MODE =
    String(import.meta.env.VITE_WEATHER_DISASTER_MODE || 'false').toLowerCase() === 'true'

/**
 * Fetch weather data from the hackathon API.
 * @param {boolean} disaster - Whether to simulate disaster conditions
 */
export async function fetchWeather(disaster = false) {
    const res = await fetch(
        `${API_BASE}/weather?disaster=${disaster}`,
        {
            headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` },
        }
    )
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`)
    return res.json()
}

/**
 * Send a prompt to the LLM via the hackathon API.
 * @param {string} systemPrompt - Instructions for the model
 * @param {string} userPrompt - The user's query
 */
export async function sendPrompt(systemPrompt, userPrompt) {
    const res = await fetch(`${API_BASE}/prompt`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
        }),
    })
    if (!res.ok) throw new Error(`LLM API error: ${res.status}`)
    return res.json()
}

/**
 * Build a system prompt for the emergency expert AI.
 */
export function buildSystemPrompt() {
    return `Eres un Sistema Experto de Protección Civil y Asistencia Inclusiva. Tu objetivo es generar alertas meteorológicas altamente personalizadas, breves y directas.

### TABLA DE UMBRALES DE RIESGO (EVALUACIÓN ESTRICTA):
Calcula el nivel de riesgo usando EXCLUSIVAMENTE estos parámetros basados en los datos (prec = precipitación acumulada diaria en mm, tmax/tmin = temperatura en ºC, racha = viento en km/h):

- BAJA: prec < 20 mm, Y temperaturas entre 0 y 34ºC, Y racha < 70 km/h (o null).
- MEDIA: prec entre 20 y 60 mm, O temperaturas entre 34-39ºC o -4-0ºC, O racha entre 70 y 90 km/h.
- ALTA: prec entre 60 y 100 mm, O temperaturas entre 39-42ºC o -8 a -4ºC, O racha entre 90 y 130 km/h.
- MUY ALTA: prec > 100 mm, O tmax > 42ºC, O tmin < -8ºC, O racha > 130 km/h.
*(Nota: El riesgo final será el más alto que se cumpla de cualquiera de las condiciones).*

### REGLAS DE LÓGICA Y COMPORTAMIENTO:
1. Analiza los datos meteorológicos usando la tabla de umbrales superior.
2. Regla de Contactos: SI EL RIESGO ES "BAJA" o "MEDIA", ESTÁ ESTRICTAMENTE PROHIBIDO mostrar la sección de "📱 Contactos". Solo muéstrala en "ALTA" o "MUY ALTA".
3. Personalización obligatoria: Las acciones sugeridas DEBEN estar adaptadas a las "necesidades_especiales" y al "tipo_vivienda" del usuario. No des consejos genéricos si el usuario tiene una limitación física; adapta la instrucción a su realidad.

FORMATO DE SALIDA ESTRICTO (Máximo 100 palabras, sin introducciones ni saludos):

### 🚨 Prioridad
**[BAJA/MEDIA/ALTA/MUY ALTA]**: [Breve justificación con el dato exacto, ej: "Riesgo por lluvia intensa de 25mm" o "Condiciones estables y seguras"].

### ✅ Qué hacer ahora
1. [Acción inmediata adaptada a su necesidad especial y vivienda]
2. [Acción relacionada con el clima actual]
3. [Acción de prevención práctica]

[OPCIONAL: SOLO MOSTRAR SI PRIORIDAD ES ALTA O MUY ALTA]
### 📱 Contactos
- **112** Emergencias
- **1006** Protección Civil

> [Frase final de advertencia o tranquilidad].`
}

/**
 * Build a personalized user prompt with weather data and profile.
 */
export function buildUserPrompt(weatherData, profile) {
    const cleanWeatherData = Object.fromEntries(
        Object.entries(weatherData).filter(([_, value]) => value !== null)
    );

    const userProfile = {
        ubicacion_usuario: profile?.provincia || "No especificada",
        tipo_vivienda: profile?.tipo_vivienda || "No especificada",
        necesidades_especiales: profile?.necesidades_especiales?.length
            ? profile.necesidades_especiales
            : ["Ninguna"]
    };

    return `<perfil_usuario>
${JSON.stringify(userProfile, null, 2)}
</perfil_usuario>

<datos_meteorologicos>
${JSON.stringify(cleanWeatherData, null, 2)}
</datos_meteorologicos>

Genera el reporte meteorológico siguiendo estrictamente el formato Markdown indicado en tus instrucciones. 
Regla vital: NO incluyas ninguna etiqueta XML en tu respuesta final. Comienza directamente con el título de Prioridad.`;
}

function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    const normalized = String(value).replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
}

function normalizeAdminWeatherData(weatherData) {
    return {
        estacion: weatherData?.nombre || 'Desconocida',
        provincia: weatherData?.provincia || 'Desconocida',
        fecha: weatherData?.fecha || null,
        precipitacion_mm: toNumberOrNull(weatherData?.prec),
        temperatura_max_c: toNumberOrNull(weatherData?.tmax),
        temperatura_min_c: toNumberOrNull(weatherData?.tmin),
        racha_kmh: toNumberOrNull(weatherData?.racha),
        viento_medio_kmh: toNumberOrNull(weatherData?.velmedia),
        humedad_max_pct: toNumberOrNull(weatherData?.hrMax),
        humedad_media_pct: toNumberOrNull(weatherData?.hrMedia),
        humedad_min_pct: toNumberOrNull(weatherData?.hrMin),
    }
}

/**
 * Build prompt pair for admin alert recommendation using AEMET-like thresholds.
 */
export function buildAdminPrompt(weatherData) {
    const cleanWeatherData = normalizeAdminWeatherData(weatherData)

    const systemPrompt = `Eres un analista meteorológico para el panel de backoffice de Protección Civil.
Debes decidir si recomendar emitir alerta general y qué nivel sugerir (amarilla, naranja o roja).

Usa esta tabla de umbrales basada en datos AEMET:
- BAJA: prec < 20 mm, tmax entre 0 y 34 C, tmin >= 0 C y racha < 70 km/h (o null)
- MEDIA: prec entre 20 y 60 mm, o tmax entre 34 y 39 C, o tmin entre -4 y 0 C, o racha entre 70 y 90 km/h
- ALTA: prec entre 60 y 100 mm, o tmax entre 39 y 42 C, o tmin entre -8 y -4 C, o racha entre 90 y 130 km/h
- MUY ALTA: prec > 100 mm, o tmax > 42 C, o tmin < -8 C, o racha > 130 km/h

Nivel final: el mas alto que se cumpla.
Mapeo de alerta:
- MEDIA -> Alerta Amarilla
- ALTA -> Alerta Naranja
- MUY ALTA -> Alerta Roja
- BAJA -> Sin alerta / monitorizacion

RESPONDE SIEMPRE en espanol y en formato exacto:
1) DECISION: una linea que empiece por "⚠️ Se recomienda emitir alerta" o "✅ No se recomienda emitir alerta".
2) NIVEL RECOMENDADO: [SIN ALERTA/ALERTA AMARILLA/ALERTA NARANJA/ALERTA ROJA]
3) JUSTIFICACION: 2-3 frases cortas con los valores concretos que activan el nivel.
4) ACCION OPERATIVA: una frase breve para el administrador.`

    const userPrompt = `Evalua estos datos meteorologicos y recomienda decision operativa para el admin:\n\n${JSON.stringify(cleanWeatherData, null, 2)}`

    return { systemPrompt, userPrompt }
}
