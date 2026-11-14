ALTER TABLE solicitudes
  MODIFY estado ENUM('borrador','enviada','en_evaluacion','rechazada','respondida','confirmada')
  NOT NULL DEFAULT 'borrador';

ALTER TABLE historial_estados
  MODIFY estado_anterior ENUM('borrador','enviada','en_evaluacion','rechazada','respondida','confirmada') NULL,
  MODIFY estado_nuevo ENUM('borrador','enviada','en_evaluacion','rechazada','respondida','confirmada') NOT NULL;
