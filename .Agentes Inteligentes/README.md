# Sistema inteligente de asesoría y gestión de cotizaciones

## Descripción

El sistema está diseñado para asistir a los clientes de SOLUCIA S.A.S. en la
definición, mejora y seguimiento de sus solicitudes de cotización para
proyectos de arquitectura, diseño y construcción.

La solución utiliza un agente supervisor para coordinar el flujo de atención y
un agente asesor para analizar los requisitos del proyecto, identificar la
información faltante y proponer recomendaciones. También contempla el
registro de las solicitudes y la consulta de su estado.

El sistema orienta al cliente, pero las evaluaciones técnicas, comerciales y
la aprobación final de las cotizaciones permanecen bajo responsabilidad del
personal de SOLUCIA.

## Objetivo general

Diseñar un sistema inteligente de asesoría y gestión de cotizaciones para
SOLUCIA S.A.S., basado en agentes de inteligencia artificial, que permita
orientar a los clientes en la definición de sus proyectos.

## Entregables

1. Notebook inicial con el flujo entre el agente supervisor y el agente
   asesor.
2. Descripción de la arquitectura y del flujo de información.
3. Implementación del agente supervisor.
4. Implementación del agente asesor.
5. Flujo de registro y consulta de solicitudes.
6. Demostración conversacional del sistema.
7. Casos de prueba y presentación de resultados.

## Arquitectura propuesta

```text
Cliente
   │
   ▼
Interfaz conversacional
   │
   ▼
Agente supervisor
   │
   ├── Agente asesor
   │      ├── Analiza requisitos
   │      ├── Identifica información faltante
   │      └── Genera recomendaciones
   │
   └── Gestión de solicitudes
          ├── Registra la solicitud
          └── Consulta el estado y el historial
```

## Notebook inicial

El notebook [`agente.ipynb`](./agente.ipynb) contiene la demostración inicial
del funcionamiento del sistema multiagente.
