# SOLUCIA S.A.S. — Backend

API REST de la plataforma de SOLUCIA S.A.S., desarrollada con Node.js y
Express. Centraliza la autenticación, la lógica de negocio y el acceso a la
base de datos para las solicitudes de cotización.

## Responsabilidades

- Autenticar usuarios y emitir tokens JWT.
- Aplicar autorización según los roles de usuario.
- Gestionar usuarios, servicios, solicitudes, cotizaciones y mensajes.
- Administrar archivos, notificaciones e historial de estados.
- Validar datos de entrada y controlar errores.
- Persistir la información en MySQL.
- Exponer una comprobación de salud en `/api/health`.

## Tecnologías

- Node.js `>=22.12.0`
- Express 5
- MySQL mediante `mysql2`
- JWT para autenticación
- Multer para carga de archivos
- Helmet, CORS, compresión y limitación de solicitudes

## Configuración

El backend requiere las siguientes variables de entorno:

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto de escucha de la API. Por defecto, `3000`. |
| `NODE_ENV` | Entorno de ejecución. |
| `DB_HOST` | Host del servidor MySQL. |
| `DB_PORT` | Puerto de MySQL. Por defecto, `3306`. |
| `DB_NAME` | Nombre de la base de datos. |
| `DB_USER` | Usuario de la base de datos. |
| `DB_PASSWORD` | Contraseña de la base de datos. |
| `JWT_SECRET` | Secreto usado para firmar los tokens JWT. |
| `FRONTEND_URL` | URL pública del frontend, usada para crear enlaces de verificación y recuperación. |
| `RESEND_API_KEY` | Clave de API de Resend, usada para enviar correos. |
| `MAIL_FROM` | Remitente verificado en Resend (por ejemplo, `SOLUCIA <no-reply@tudominio.com>`). |
| `CORS_ORIGINS` | Orígenes permitidos, separados por comas. |
| `UPLOADS_DIR` | Carpeta para archivos subidos. Por defecto, `/app/uploads`. |

En producción, `JWT_SECRET` debe tener al menos 32 caracteres. Las
credenciales deben configurarse mediante variables de entorno y no deben
guardarse en el repositorio.

El registro requiere configurar `RESEND_API_KEY`, un `MAIL_FROM` autorizado por
Resend y `FRONTEND_URL` (obligatorio en producción). Verifica tu dominio en
Resend antes de usar un remitente propio. La cuenta queda pendiente hasta que el
usuario verifica su correo; el enlace vence después de 24 horas y solo puede
usarse una vez. Los tokens se guardan como hashes. La recuperación de contraseña
usa el mismo servicio de correo; sus enlaces vencen después de 30 minutos y solo
pueden usarse una vez. Si el servicio de correo falla, la API devuelve un error
visible y permite solicitar de nuevo la verificación.

Para bases de datos existentes, ejecuta una vez
`database/migrations/20261113_verificacion_email.sql`; las cuentas ya existentes
se conservan como verificadas. El script de inicialización de MySQL solo se
ejecuta automáticamente al crear un volumen de datos nuevo.

Para habilitar el rechazo de solicitudes en una base de datos existente,
ejecuta una vez `database/migrations/20261113_rechazar_solicitudes.sql`.

## Desarrollo local

Requiere Node.js `>=22.12.0` y una instancia de MySQL configurada.

Desde esta carpeta:

```powershell
npm install
npm run dev
```

Para ejecutar sin el modo de observación:

```powershell
npm start
```

La API escucha por defecto en `http://localhost:3000`. Su comprobación de
salud está disponible en `http://localhost:3000/api/health`.

## Ejecución con Docker

Desde la raíz del repositorio, crea el archivo local de variables y levanta
el entorno completo:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

En Docker, el backend se ejecuta en el puerto `3000` dentro de la red
interna. El frontend funciona como proxy y expone la API mediante
`/api/`. Los archivos subidos se conservan en el volumen `uploads`.

Para detener los servicios sin eliminar los datos:

```powershell
docker compose down
```

No uses `docker compose down -v` si deseas conservar la base de datos y los
archivos almacenados en los volúmenes.

## Estructura principal

```text
backend/
├── src/
│   ├── config/       # CORS y validación de entorno
│   ├── controllers/  # Lógica de los casos de uso
│   ├── middleware/   # Seguridad, autenticación, archivos y errores
│   ├── model/        # Conexión y modelos de datos
│   ├── routes/       # Rutas HTTP de la API
│   ├── utils/        # Validaciones y utilidades
│   └── server.js     # Punto de entrada de Express
├── Dockerfile
└── package.json
```
