# SOLUCIA S.A.S

SOLUCIA S.A.S. es una plataforma para gestionar servicios, solicitudes de
cotización y la comunicación entre clientes y administradores.

La aplicación permite a los clientes registrarse, consultar los servicios
disponibles, enviar solicitudes y hacer seguimiento a su estado. Los
administradores pueden revisar las solicitudes, gestionar cotizaciones y
mantener la información actualizada.

## Funcionalidades principales

- Registro e inicio de sesión de usuarios.
- Gestión de perfiles y roles.
- Consulta de servicios ofrecidos.
- Creación y seguimiento de solicitudes de cotización.
- Gestión de cotizaciones por parte de administradores.
- Comunicación mediante mensajes y notificaciones.
- Carga y administración de archivos asociados a las solicitudes.

## Arquitectura

```text
Navegador
   │
   ▼
Frontend Astro + NGINX
   │
   ▼
Backend Node.js + Express
   │
   ▼
Base de datos MySQL
```

El frontend ofrece la interfaz web y envía las solicitudes a la API. El
backend contiene la lógica de negocio, autenticación y validación de datos.
MySQL almacena la información de usuarios, servicios, solicitudes,
cotizaciones y demás componentes de la plataforma.

## Ejecución

1. Crea un archivo `.env` a partir de `.env.example`.
2. Define contraseñas seguras para MySQL y un `JWT_SECRET` aleatorio.
3. Inicia los servicios:

```powershell
docker compose up --build -d
```

La aplicación estará disponible en `http://localhost`. Para detener los
servicios:

```powershell
docker compose down
```

## Estructura

```text
.
├── Agentes Inteligentes/  # Sistema de asesoría basado en agentes
├── Cloud Computing/       # Documentación de despliegue y contenedores
├── backend/               # API REST
├── database/              # Inicialización de MySQL
├── frontend/              # Aplicación web
├── docker-compose.yml     # Orquestación de servicios
└── README.md              # Documentación general
```

## Documentación

- [Sistema de agentes](./Agentes%20Inteligentes/README.md)
- [Cloud Computing](./Cloud%20Computing/README.md)
- [Frontend](./frontend/README.md)
- [Backend](./backend/README.md)
