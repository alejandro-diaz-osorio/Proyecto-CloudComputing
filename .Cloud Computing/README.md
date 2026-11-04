# Cloud Computing

## Descripción

Este componente contiene la configuración necesaria para ejecutar la
plataforma de SOLUCIA S.A.S. de forma reproducible mediante contenedores
Docker.

## Arquitectura de despliegue

```text
Internet
   │
   ▼
Frontend Astro + NGINX
   │  /api/
   ▼
Backend Node.js + Express
   │
   ├── MySQL
   └── Volumen de archivos subidos

phpMyAdmin ───► MySQL
```

## Servicios

- **Frontend:** construye la aplicación Astro y la sirve con NGINX. También
  redirige las solicitudes `/api/` hacia el backend.
- **Backend:** ejecuta la API REST y se conecta con MySQL.
- **Database:** almacena la información de la plataforma y conserva sus datos
  en el volumen `db_data`.
- **phpMyAdmin:** permite administrar MySQL desde una interfaz web.
- **Docker Compose:** conecta los servicios, configura sus dependencias,
  redes, volúmenes y comprobaciones de salud.

## Requisitos

- Docker Desktop con Docker Compose.
- Un archivo `.env` en la raíz del proyecto.

Para crear la configuración local:

```powershell
Copy-Item .env.example .env
```

Antes de iniciar los contenedores, cambia las contraseñas de MySQL y define un
`JWT_SECRET` seguro. No publiques el archivo `.env`.

## Ejecución

Desde la raíz del repositorio:

```powershell
docker compose up --build -d
```

Direcciones principales:

- Aplicación: `http://localhost` o el puerto definido en `FRONTEND_PORT`.
- phpMyAdmin: `http://localhost:8081` o el puerto definido en
  `PHPMYADMIN_PORT`.
- API: disponible a través de `/api/`.
- Salud de la API: `/api/health`.

Para ver el estado y los registros:

```powershell
docker compose ps
docker compose logs -f backend
```

Para detener los servicios sin eliminar los datos:

```powershell
docker compose down
```

No uses `docker compose down -v` si deseas conservar la base de datos y los
archivos almacenados en los volúmenes `db_data` y `uploads`.

## Documentación relacionada

- [Frontend](../frontend/README.md)
- [Backend](../backend/README.md)
- [Configuración de Compose](../docker-compose.yml)
- [Informe técnico](../BLOQUES_2_Y_3.txt)
