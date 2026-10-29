CREATE DATABASE IF NOT EXISTS solucia;
USE solucia;

CREATE TABLE  users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE  quotations (
  id INT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NULL,
  project_type VARCHAR(50) NULL,
  message TEXT NULL,
  status ENUM('Enviada', 'En evaluación', 'Respondida', 'Confirmada') NOT NULL DEFAULT 'Enviada',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX  idx_users_email ON users (email);
CREATE INDEX  idx_quotations_status ON quotations (status);
