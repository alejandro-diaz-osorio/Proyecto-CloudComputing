"""Servicio FastAPI de Sol. Solo debe ser alcanzable desde el backend Express (red interna)."""
import hmac
import logging
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

from .grafo import modo_actual, sol_graph  # noqa: E402  (después de cargar .env)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sol")

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
    descripcion: str = Field(default="", max_length=4000)
    ubicacion: str = Field(default="", max_length=200)
    area_m2: float | None = Field(default=None, ge=0, le=10_000_000)
    servicios: list[str] = Field(default_factory=list, max_length=20)
    archivos: list[str] = Field(default_factory=list, max_length=20)
    mensaje: str = Field(default="", max_length=1000)
    historial: list[Mensaje] = Field(default_factory=list, max_length=12)


class Salida(BaseModel):
    respuesta: str
    preguntas_pendientes: list[str]
    documentos_pendientes: list[str]
    descripcion_mejorada: str
    modo: str


@app.get("/health")
def health():
    return {"status": "ok", "modo": modo_actual()}


@app.post("/sol/analizar", response_model=Salida, dependencies=[Depends(verificar_token)])
async def analizar(datos: Entrada):
    estado = {
        "tipo_proyecto": datos.tipo_proyecto,
        "descripcion": datos.descripcion,
        "ubicacion": datos.ubicacion,
        "area_m2": datos.area_m2,
        "servicios": [s[:100] for s in datos.servicios],
        "archivos": [a[:200] for a in datos.archivos],
        "mensaje_usuario": datos.mensaje,
        "historial": [m.model_dump() for m in datos.historial],
    }
    try:
        r = await sol_graph.ainvoke(estado)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        log.exception("Error en el grafo de Sol")
        raise HTTPException(status_code=500, detail="Error interno")
    return Salida(
        respuesta=r["respuesta"],
        preguntas_pendientes=r["preguntas_pendientes"],
        documentos_pendientes=r["documentos_pendientes"],
        descripcion_mejorada=r["descripcion_mejorada"],
        modo=r["modo"],
    )