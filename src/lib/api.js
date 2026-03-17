/**
 * API helpers for the hackathon external API (weather + LLM)
 * and prompt engineering utilities.
 */

const API_BASE = '/api'
const BEARER_TOKEN = import.meta.env.VITE_BEARER_TOKEN || ''

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
    return `Eres un experto en gestión de emergencias climáticas y protección civil en España. Tu misión es proporcionar instrucciones de seguridad PERSONALIZADAS y ESPECÍFICAS basadas en el perfil del ciudadano y las condiciones meteorológicas actuales.

REGLAS ESTRICTAS:
1. Adapta tus instrucciones al TIPO DE VIVIENDA del usuario:
   - Sótano: prioriza evacuación vertical, riesgo de inundación extremo
   - Planta baja: riesgo alto de inundación, preparar evacuación
   - Piso alto: generalmente más seguro ante inundaciones, pero atención a vientos
   - Casa de campo: aislamiento, riesgo de riadas y accesos cortados
2. Ten en cuenta las NECESIDADES ESPECIALES:
   - Silla de ruedas/movilidad reducida: rutas accesibles, ayuda necesaria
   - Persona dependiente: plan de evacuación asistida
   - Mascotas: incluir en plan de evacuación
   - Discapacidad visual/auditiva: alertas adaptadas
3. Sé CLARO, DIRECTO y prioriza la seguridad vital
4. Da instrucciones PASO A PASO, de más urgente a menos urgente
5. Indica cuándo llamar al 112
6. Responde SIEMPRE en español
7. Usa formato con viñetas y secciones claras`
}

/**
 * Build a personalized user prompt with weather data and profile.
 */
export function buildUserPrompt(weatherData, profile) {
    const necesidades = profile.necesidades_especiales?.length
        ? profile.necesidades_especiales.join(', ')
        : 'Ninguna especificada'

    return `DATOS METEOROLÓGICOS ACTUALES:
${JSON.stringify(weatherData, null, 2)}

PERFIL DEL CIUDADANO:
- Provincia: ${profile.provincia || 'No especificada'}
- Tipo de vivienda: ${profile.tipo_vivienda || 'No especificado'}
- Necesidades especiales: ${necesidades}

Basándote en estos datos meteorológicos y el perfil específico de este ciudadano, ¿qué precauciones y acciones concretas debe tomar esta persona AHORA MISMO para proteger su vida y la de sus dependientes?`
}
