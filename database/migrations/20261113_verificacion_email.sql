ALTER TABLE usuarios
  ADD COLUMN email_verificado_en DATETIME NULL AFTER activo;

UPDATE usuarios
SET email_verificado_en = UTC_TIMESTAMP()
WHERE email_verificado_en IS NULL;

CREATE TABLE tokens_verificacion_email (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token_verificacion_hash (token_hash),
  KEY ix_token_verificacion_usuario (usuario_id),
  CONSTRAINT fk_token_verificacion_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;
