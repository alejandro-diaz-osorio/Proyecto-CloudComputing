# SOLUCIA S.A.S. — Frontend

Frontend de la plataforma de SOLUCIA S.A.S., construido con Astro. Incluye
las páginas públicas, autenticación, portal de clientes y vistas
administrativas para gestionar solicitudes y cotizaciones.

## Responsabilidades

- Renderizar la interfaz web y sus componentes.
- Gestionar los flujos de inicio de sesión y registro.
- Permitir a los clientes crear solicitudes y consultar su estado.
- Mostrar las funciones disponibles para usuarios administradores.
- Consumir la API del backend mediante rutas `/api/`.

El frontend no contiene la lógica de persistencia ni se conecta directamente
con MySQL. Las operaciones de negocio se realizan a través del backend.

## Tecnologías

- Astro
- TypeScript y JavaScript
- Tailwind CSS
- NGINX para servir los archivos generados y redirigir `/api/` al backend

## Desarrollo local

Requiere Node.js `>=22.12.0` y pnpm.

Desde esta carpeta:

```powershell
pnpm install
pnpm dev
```

La aplicación estará disponible en la dirección que indique Astro,
normalmente `http://localhost:4321`.

Para generar y revisar la versión de producción:

```powershell
pnpm build
pnpm preview
```

## Ejecución con Docker

El `Dockerfile` utiliza una construcción multietapa:

1. Instala las dependencias y genera la aplicación estática con Astro.
2. Copia el resultado a una imagen de NGINX.

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

El sitio estará disponible en `http://localhost` o en el puerto definido por
`FRONTEND_PORT`. NGINX sirve los archivos estáticos y reenvía las solicitudes
que comienzan por `/api/` al servicio `backend`.

Para detener los servicios:

```powershell
docker compose down
```

## Estructura principal

```text
frontend/
├── public/       # Recursos estáticos
├── src/
│   ├── components/ # Componentes reutilizables
│   ├── features/   # Funcionalidades de autenticación y portal
│   ├── layouts/    # Plantillas de página
│   ├── lib/        # Configuración, rutas y utilidades HTTP
│   ├── pages/      # Rutas de Astro
│   └── styles/     # Estilos globales y específicos
├── Dockerfile
├── nginx.conf
└── package.json
```
