# Solucia S.A.S. — Frontend

Frontend estático construido con Astro y servido por NGINX. NGINX también envía las solicitudes a `/api/` al servicio Express.

## Ejecutar el entorno completo

Desde la raíz del proyecto, crea el archivo local de variables y cambia sus valores:

```powershell
Copy-Item .env.example .env
```

Usa contraseñas y un `JWT_SECRET` aleatorios en `.env`; no publiques ese archivo. Luego inicia los servicios:

```powershell
docker compose up --build -d
```

- Sitio: `http://localhost:8080` (o el puerto `FRONTEND_PORT`).
- phpMyAdmin: `http://localhost:8081` (o el puerto `PHPMYADMIN_PORT`).
- API: disponible internamente mediante `/api/`; su comprobación de salud está en `/api/health`.

MySQL guarda sus datos en el volumen `db_data`; los archivos subidos por la API usan el volumen `uploads`. Para detener los contenedores sin borrar los datos:

```powershell
docker compose down
```

## Desarrollo local del frontend

```sh
pnpm install
pnpm dev
```

Para generar los archivos estáticos que NGINX sirve en producción:

```sh
pnpm build
```
