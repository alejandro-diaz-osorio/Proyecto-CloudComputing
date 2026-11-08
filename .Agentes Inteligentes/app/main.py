"""Servicio FastAPI de Sol. Solo debe ser alcanzable desde el backend Express (red interna)."""
import hmac
import logging
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

from .grafo import VERSION, modo_actual, sol_graph  # noqa: E402  (después de cargar .env)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sol")
log.info("Sol grafo versión %s (modo %s)", VERSION, modo_actual())

app = FastAPI(title="Sol - agentes", docs_url=None, redoc_url=None, openapi_url=None)


def verificar_token(x_sol_token: str | None = Header(default=None)) -> None:
    esperado = os.getenv("SOL_SHARED_SECRET", "")
    if not esperado:
        return  # desarrollo local sin secreto
    if not x_sol_token or not hmac.compare_digest(x_sol_token, esperado):
        raise HTTPException(status_code=401, detail="No autorizado")


class Mensaje(BaseModel):
    rol: Literal["cliente", "sol"]
    texto: str = Field(max_length=1000)


class Entrada(BaseModel):
    tipo_proyecto: str = Field(default="", max_length=40)
    descripcion: str = Field(default="", max_length=4000)  # campo "Describe lo que imaginas..."
    mensaje: str = Field(default="", max_length=1000)
    historial: list[Mensaje] = Field(default_factory=list, max_length=30)
    ficha: dict[str, str] = Field(default_factory=dict, max_length=30)  # ficha del turno anterior


class Salida(BaseModel):
    respuesta: str
    borrador: str  # vacío si Sol todavía no propone un borrador
    ficha: dict[str, str]  # ficha actualizada: el cliente la guarda y la reenvía en el siguiente turno
    modo: str
    version: str = ""  # versión del grafo que respondió (para comprobar el despliegue)


@app.get("/health")
def health():
    return {"status": "ok", "modo": modo_actual(), "version": VERSION}


@app.post("/sol/analizar", response_model=Salida, dependencies=[Depends(verificar_token)])
async def analizar(datos: Entrada):
    if not datos.mensaje.strip() and not datos.descripcion.strip():
        raise HTTPException(status_code=422, detail="Escribe un mensaje o describe tu proyecto.")
    estado = {
        "tipo_proyecto": datos.tipo_proyecto,
        "descripcion": datos.descripcion,
        "mensaje_usuario": datos.mensaje,
        "historial": [m.model_dump() for m in datos.historial],
        "ficha_previa": datos.ficha,
    }
    try:
        r = await sol_graph.ainvoke(estado)
    except Exception:
        log.exception("Error en el grafo de Sol")
        raise HTTPException(status_code=500, detail="Error interno")
    return Salida(
        respuesta=r["respuesta"],
        borrador=r["borrador"],
        ficha=r["ficha"],
        modo=r["modo"],
        version=r.get("version", ""),
    )