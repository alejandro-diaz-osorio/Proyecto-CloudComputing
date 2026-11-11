# Asistente Sol para estructurar descripciones de proyectos

## Descripción

Sol ayuda al cliente a organizar el texto del campo «Describe lo que imaginas
para tu proyecto» durante la creación de una solicitud. Cada turno devuelve
una descripción editable; el cliente decide si la usa y puede seguir
modificándola. Si falta contexto importante, Sol hace una sola pregunta
concreta por turno (por ejemplo, qué espacios se van a remodelar y qué se
quiere cambiar). No exige completar un cuestionario ni reemplaza la evaluación
de un arquitecto.

## Arquitectura

```text
Formulario de solicitud → Backend → Servicio Sol (FastAPI/LangGraph)
                                     ├── Gemini si hay GOOGLE_API_KEY
                                     └── Estructuración por reglas si no hay IA
```

El servicio no necesita una base vectorial para estructurar el texto que el
cliente acaba de escribir. La ficha y el historial de chat se envían desde la
interfaz en cada petición; la solicitud se guarda por separado en la base de
datos de la aplicación.

Si más adelante se desea consultar ejemplos de proyectos o documentación
interna, se puede añadir una base vectorial independiente (por ejemplo,
Qdrant) para recuperar solo esos documentos como contexto. No se deben
indexar datos privados de clientes sin definir antes su autorización,
retención y controles de acceso.
