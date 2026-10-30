-- =====================================================================
-- SOLUCIA S.A.S. · Esquema de base de datos (MySQL 8)
-- Plataforma de cotizaciones de arquitectura: cliente + administración
-- Se ejecuta automáticamente al crear el contenedor de MySQL
-- (montar en /docker-entrypoint-initdb.d/init.sql; usa la BD de MYSQL_DATABASE)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- No se crea ni se selecciona la base de datos aquí: el contenedor de MySQL ejecuta
-- este script sobre la base definida en MYSQL_DATABASE (variable del .env).

-- ---------------------------------------------------------------------
-- 1. USUARIOS: clientes y administradoras (arquitectas/os)
--    rol 'admin' = quien evalúa y cotiza. Nunca se borran: se desactivan.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(80)  NOT NULL,
  apellido      VARCHAR(80)  NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,              -- bcrypt/argon2, nunca texto plano
  telefono      VARCHAR(25)  NULL,
  rol           ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. SERVICIOS: catálogo editable (antes era una lista fija en el formulario)
-- ---------------------------------------------------------------------
CREATE TABLE servicios (
  id     SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  activo TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_servicios_nombre (nombre)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. SOLICITUDES: una por proyecto del cliente (wizard de 4 pasos)
--    Los datos del paso 2 son opcionales ("puedes dejar en blanco...").
--    codigo ('SOL-0248') lo asigna el backend en la misma transacción
--    del INSERT (MySQL no permite columna generada sobre AUTO_INCREMENT).
-- ---------------------------------------------------------------------
CREATE TABLE solicitudes (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo             VARCHAR(12)  NULL,
  cliente_id         INT UNSIGNED NOT NULL,
  arquitecto_id      INT UNSIGNED NULL,              -- admin responsable; se asigna al pasar a 'en_evaluacion'
  titulo             VARCHAR(150) NOT NULL,          -- "Casa campestre El Retiro"
  tipo_proyecto      ENUM('vivienda','comercial','otro') NOT NULL,
  descripcion        TEXT         NOT NULL,          -- texto final que verá la administradora
  descripcion_ia     TEXT         NULL,              -- versión sugerida por Sol (asistente IA)
  usar_version_ia    TINYINT(1)   NOT NULL DEFAULT 0,-- 1 si el cliente aceptó "Usar esta versión"
  ubicacion          VARCHAR(150) NULL,              -- "El Retiro, Antioquia"
  area_m2            DECIMAL(10,2) NULL,
  presupuesto_min    DECIMAL(14,0) NULL,             -- COP; el desplegable "450 - 600 millones" se guarda como rango
  presupuesto_max    DECIMAL(14,0) NULL,
  plazo_inicio       ENUM('proximo_mes','proximos_3_meses','proximos_6_meses','mas_adelante','sin_definir') NULL,
  estado             ENUM('borrador','enviada','en_evaluacion','respondida','confirmada')
                     NOT NULL DEFAULT 'borrador',    -- 'borrador' no aparece en el seguimiento del cliente
  enviada_en         DATETIME     NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_solicitudes_codigo (codigo),
  KEY ix_solicitudes_cliente  (cliente_id, created_at),
  KEY ix_solicitudes_estado   (estado, enviada_en),   -- lista y contador "Nuevas" del panel admin
  KEY ix_solicitudes_arquitecto (arquitecto_id, estado),
  CONSTRAINT fk_solicitudes_cliente    FOREIGN KEY (cliente_id)    REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_solicitudes_arquitecto FOREIGN KEY (arquitecto_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT ck_solicitudes_area   CHECK (area_m2 IS NULL OR area_m2 > 0),
  CONSTRAINT ck_solicitudes_presup CHECK (presupuesto_min IS NULL OR presupuesto_max IS NULL
                                          OR presupuesto_max >= presupuesto_min)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. SOLICITUD_SERVICIOS (N:M): una solicitud puede pedir varios servicios
--    ("Diseño + cálculo estructural", "Diseño + remodelación")
-- ---------------------------------------------------------------------
CREATE TABLE solicitud_servicios (
  solicitud_id INT UNSIGNED      NOT NULL,
  servicio_id  SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (solicitud_id, servicio_id),
  KEY ix_ss_servicio (servicio_id),
  CONSTRAINT fk_ss_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_ss_servicio  FOREIGN KEY (servicio_id)  REFERENCES servicios(id)   ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. ARCHIVOS: metadatos; el binario vive en el volumen 'uploads'
--    (planos, referencias del cliente y PDF de cada cotización)
-- ---------------------------------------------------------------------
CREATE TABLE archivos (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  solicitud_id      INT UNSIGNED NOT NULL,
  subido_por        INT UNSIGNED NOT NULL,
  categoria         ENUM('referencia','plano','cotizacion') NOT NULL DEFAULT 'referencia',
  nombre_original   VARCHAR(255) NOT NULL,           -- "referencias-proyecto.pdf"
  nombre_almacenado VARCHAR(255) NOT NULL,           -- UUID generado por el backend (evita colisiones y rutas maliciosas)
  mime_type         VARCHAR(100) NOT NULL,
  tamano_bytes      BIGINT UNSIGNED NOT NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_archivos_almacenado (nombre_almacenado),
  KEY ix_archivos_solicitud (solicitud_id),
  CONSTRAINT fk_archivos_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_archivos_usuario   FOREIGN KEY (subido_por)   REFERENCES usuarios(id)    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. COTIZACIONES: N versiones por solicitud (si el cliente pide cambios)
--    Solo una puede estar 'vigente' por solicitud (índice único abajo).
-- ---------------------------------------------------------------------
CREATE TABLE cotizaciones (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  solicitud_id  INT UNSIGNED NOT NULL,
  version       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  creada_por    INT UNSIGNED NOT NULL,
  titulo        VARCHAR(120) NOT NULL DEFAULT 'Propuesta comercial',
  valor         DECIMAL(14,2) NOT NULL,              -- 18600000.00
  moneda        CHAR(3)      NOT NULL DEFAULT 'COP',
  iva_incluido  TINYINT(1)   NOT NULL DEFAULT 1,
  vigencia_dias SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  mensaje       TEXT         NULL,                   -- alcance / mensaje para el cliente
  archivo_id    INT UNSIGNED NULL,                   -- PDF de la propuesta (tabla archivos)
  estado        ENUM('borrador','vigente','reemplazada','confirmada') NOT NULL DEFAULT 'borrador',
  enviada_en    DATETIME     NULL,
  vence_en      DATE         NULL,                   -- enviada_en + vigencia_dias (lo calcula el backend)
  confirmada_en DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Garantiza a nivel de BD una sola cotización 'vigente' por solicitud
  vigente_de    INT UNSIGNED GENERATED ALWAYS AS (IF(estado = 'vigente', solicitud_id, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cot_solicitud_version (solicitud_id, version),
  UNIQUE KEY uq_cot_una_vigente (vigente_de),
  KEY ix_cot_creada_por (creada_por),
  KEY ix_cot_archivo (archivo_id),
  CONSTRAINT fk_cot_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_cot_creada    FOREIGN KEY (creada_por)   REFERENCES usuarios(id)    ON DELETE RESTRICT,
  CONSTRAINT fk_cot_archivo   FOREIGN KEY (archivo_id)   REFERENCES archivos(id)    ON DELETE SET NULL,
  CONSTRAINT ck_cot_valor    CHECK (valor > 0),
  CONSTRAINT ck_cot_vigencia CHECK (vigencia_dias > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. HISTORIAL_ESTADOS: alimenta la línea de tiempo del cliente
--    ("Completado") y deja trazabilidad de quién cambió qué y cuándo
-- ---------------------------------------------------------------------
CREATE TABLE historial_estados (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  solicitud_id    INT UNSIGNED NOT NULL,
  estado_anterior ENUM('borrador','enviada','en_evaluacion','respondida','confirmada') NULL,
  estado_nuevo    ENUM('borrador','enviada','en_evaluacion','respondida','confirmada') NOT NULL,
  cambiado_por    INT UNSIGNED NOT NULL,
  nota            VARCHAR(255) NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_hist_solicitud (solicitud_id, created_at),
  KEY ix_hist_usuario (cambiado_por),
  CONSTRAINT fk_hist_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_usuario   FOREIGN KEY (cambiado_por) REFERENCES usuarios(id)    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. MENSAJES: botón "Hacer una consulta" (cliente) y chat de la solicitud
-- ---------------------------------------------------------------------
CREATE TABLE mensajes (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  solicitud_id INT UNSIGNED NOT NULL,
  autor_id     INT UNSIGNED NOT NULL,
  cuerpo       TEXT         NOT NULL,
  leido_en     DATETIME     NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_msg_solicitud (solicitud_id, created_at),
  KEY ix_msg_autor (autor_id),
  CONSTRAINT fk_msg_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_autor     FOREIGN KEY (autor_id)     REFERENCES usuarios(id)    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. NOTIFICACIONES: campana con punto rojo en ambas vistas
-- ---------------------------------------------------------------------
CREATE TABLE notificaciones (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   INT UNSIGNED NOT NULL,                -- destinatario
  solicitud_id INT UNSIGNED NULL,
  tipo         ENUM('solicitud_nueva','solicitud_asignada','cotizacion_lista',
                    'cotizacion_confirmada','mensaje_nuevo') NOT NULL,
  texto        VARCHAR(255) NOT NULL,
  leida        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_notif_usuario (usuario_id, leida, created_at),
  KEY ix_notif_solicitud (solicitud_id),
  CONSTRAINT fk_notif_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)    ON DELETE CASCADE,
  CONSTRAINT fk_notif_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- DATOS INICIALES: catálogo de servicios
-- (los 7 del formulario actual + 'Remodelación', que aparece en los mockups)
-- ---------------------------------------------------------------------
INSERT INTO servicios (nombre) VALUES
  ('Diseño arquitectónico'),
  ('Diseño urbano'),
  ('Cálculo estructural'),
  ('Construcción'),
  ('Trámite de licencias'),
  ('Comercialización'),
  ('Remodelación'),
  ('Otro');