-- Store student identity details on approved student profiles and keep public
-- registration submissions outside users until a registrar approves them.
ALTER TABLE student_profiles
  ADD COLUMN first_name VARCHAR(80) NULL AFTER student_number,
  ADD COLUMN last_name VARCHAR(80) NULL AFTER first_name,
  ADD COLUMN name_suffix VARCHAR(20) NULL AFTER last_name,
  ADD COLUMN date_of_birth DATE NULL AFTER name_suffix;

CREATE TABLE IF NOT EXISTS student_registration_requests (
  request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_number VARCHAR(30) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  name_suffix VARCHAR(20) NULL,
  date_of_birth DATE NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NULL,
  request_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pending_student_number VARCHAR(30) GENERATED ALWAYS AS (IF(request_status = 'pending', student_number, NULL)) STORED,
  pending_email VARCHAR(254) GENERATED ALWAYS AS (IF(request_status = 'pending', email, NULL)) STORED,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_registration_pending_student_number (pending_student_number),
  UNIQUE KEY uq_registration_pending_email (pending_email),
  KEY ix_registration_status_created (request_status, created_at),
  CONSTRAINT fk_registration_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_registration_created_user
    FOREIGN KEY (created_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
