// Cliente HTTP del servicio Python de Sol (red interna de Docker).
const TIMEOUT_MS = 30000;

class SolError extends Error {
  constructor(mensaje, estado = 503) {
    super(mensaje);
    this.name = 'SolError';
    this.estado = estado;
  }
}

async function analizar(payload) {
  const base = process.env.SOL_SERVICE_URL;
  if (!base) throw new SolError('Sol no está disponible en este momento.', 503);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${base}/sol/analizar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sol-Token': process.env.SOL_SHARED_SECRET || '',
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      console.error('Sol respondió con estado', r.status);
      throw new SolError('Sol no pudo responder ahora. Inténtalo de nuevo en unos minutos.', 502);
    }
    return await r.json();
  } catch (err) {
    if (err instanceof SolError) throw err;
    console.error('Error al consultar a Sol:', err.name);
    throw new SolError('Sol no está disponible en este momento.', 503);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { analizar, SolError };