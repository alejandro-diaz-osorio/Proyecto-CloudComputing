import { http } from '../../lib/http.js';

/**
 * Pide a Sol que revise la solicitud en curso.
 * @returns {Promise<{respuesta: string, preguntas_pendientes: string[], documentos_pendientes: string[], descripcion_mejorada: string}>}
 */
export const analizarConSol = (cuerpo) => http.post('/sol/analizar', cuerpo);