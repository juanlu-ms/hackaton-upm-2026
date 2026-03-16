# hackaton-upm-2026

Documentación y código para el hackaton de la UPM de 2026.

## Guía de Uso de la API

A continuación se detallan los endpoints disponibles para los alumnos y ejemplos de cómo consultarlos.

### 1. Autenticación

Para acceder a los endpoints de `/weather` y `prompt`, es necesario registrarse e iniciar sesión para obtener un **Bearer Token**.

#### Registro
Crea una cuenta para tu equipo.
- **URL**: `POST /register`
- **Body (Form Data)**: `nickName`, `teamName`, `password`

```bash
curl -X POST http://ec2-54-171-51-31.eu-west-1.compute.amazonaws.com/register \
     -d "nickName=mi_usuario" \
     -d "teamName=mi_equipo" \
     -d "password=mi_password"
```

#### Login
Obtén el token de acceso.
- **URL**: `POST /login`
- **Body (Form Data)**: `nickName`, `password`

```bash
curl -X POST http://ec2-54-171-51-31.eu-west-1.compute.amazonaws.com/login \
     -d "nickName=mi_usuario" \
     -d "password=mi_password"
```
*Nota: El servidor redirige al root con el token en la URL, pero el token se genera y valida mediante JWT.*

### 2. Endpoints del Proyecto

Todos estos endpoints requieren la cabecera `Authorization: Bearer <TOKEN>`.

#### Obtener Clima
Devuelve datos meteorológicos aleatorios.
- **URL**: `GET /weather`
- **Query Params**: `disaster=true|false` (opcional)

```bash
curl -X GET "http://ec2-54-171-51-31.eu-west-1.compute.amazonaws.com/weather?disaster=false" \
     -H "Authorization: Bearer <TU_TOKEN>"
```

#### Enviar Prompt al LLM
Envía instrucciones y una consulta al modelo de lenguaje (Bedrock Knowledge Base).
- **URL**: `POST /prompt`
- **Body (JSON)**: `system_prompt`, `user_prompt`

```bash
curl -X POST http://ec2-54-171-51-31.eu-west-1.compute.amazonaws.com/prompt \
     -H "Authorization: Bearer <TU_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
           "system_prompt": "Eres un asistente experto en meteorología.",
           "user_prompt": "¿Qué precauciones debo tomar ante una lluvia de 800mm?"
         }'
```

---
*Desarrollado para el Hackaton UPM 2026.*
