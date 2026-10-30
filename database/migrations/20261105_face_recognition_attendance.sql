-- Classroom attendance reuses existing users, offerings, enrollments, and class meetings.
CREATE TABLE IF NOT EXISTS attendance_settings (
  setting_id TINYINT UNSIGNED NOT NULL,
  grace_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  attendance_window_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 360,
  face_similarity_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  face_quality_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.60,
  updated_by_user_id BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_id),
  CONSTRAINT chk_attendance_settings_singleton CHECK (setting_id = 1),
  CONSTRAINT chk_attendance_grace CHECK (grace_minutes <= 60),
  CONSTRAINT chk_attendance_window CHECK (attendance_window_minutes BETWEEN 15 AND 480),
  CONSTRAINT chk_face_similarity_threshold CHECK (face_similarity_threshold BETWEEN 0.30 AND 0.90),
  CONSTRAINT chk_face_quality_threshold CHECK (face_quality_threshold BETWEEN 0.40 AND 0.95),
  CONSTRAINT fk_attendance_settings_updater FOREIGN KEY (updated_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT IGNORE INTO attendance_settings (setting_id, grace_minutes, attendance_window_minutes)
VALUES (1, 10, 360);

CREATE TABLE IF NOT EXISTS attendance_kiosks (
  kiosk_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kiosk_name VARCHAR(120) NOT NULL,
  room VARCHAR(100) NOT NULL,
  secret_hash CHAR(64) NOT NULL,
  kiosk_status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (kiosk_id),
  UNIQUE KEY uq_attendance_kiosks_room (room),
  KEY ix_attendance_kiosks_status (kiosk_status),
  CONSTRAINT fk_attendance_kiosks_creator FOREIGN KEY (created_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_sessions (
  session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  meeting_id BIGINT UNSIGNED NOT NULL,
  kiosk_id BIGINT UNSIGNED NOT NULL,
  session_date DATE NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  attendance_deadline DATETIME NOT NULL,
  grace_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  session_status ENUM('active', 'paused', 'closed') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  absences_finalized_at DATETIME NULL,
  PRIMARY KEY (session_id),
  UNIQUE KEY uq_attendance_meeting_date (meeting_id, session_date),
  KEY ix_attendance_sessions_status_dates (session_status, starts_at, attendance_deadline),
  KEY ix_attendance_sessions_kiosk_date (kiosk_id, session_date),
  CONSTRAINT chk_attendance_session_dates CHECK (ends_at > starts_at AND attendance_deadline >= starts_at),
  CONSTRAINT fk_attendance_sessions_meeting FOREIGN KEY (meeting_id) REFERENCES class_meetings (meeting_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_sessions_kiosk FOREIGN KEY (kiosk_id) REFERENCES attendance_kiosks (kiosk_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_face_templates (
  student_user_id BIGINT UNSIGNED NOT NULL,
  encrypted_template MEDIUMBLOB NOT NULL,
  nonce BINARY(12) NOT NULL,
  auth_tag BINARY(16) NOT NULL,
  model_version VARCHAR(40) NOT NULL,
  consent_at DATETIME NOT NULL,
  template_status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_user_id),
  KEY ix_student_face_templates_status (template_status),
  CONSTRAINT fk_student_face_templates_student FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pending_student_face_templates (
  request_id BIGINT UNSIGNED NOT NULL,
  encrypted_template MEDIUMBLOB NOT NULL,
  nonce BINARY(12) NOT NULL,
  auth_tag BINARY(16) NOT NULL,
  model_version VARCHAR(40) NOT NULL,
  consent_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  KEY ix_pending_face_templates_created (created_at),
  CONSTRAINT fk_pending_face_templates_request FOREIGN KEY (request_id) REFERENCES student_registration_requests (request_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_records (
  attendance_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  student_user_id BIGINT UNSIGNED NOT NULL,
  attendance_status ENUM('present', 'late', 'excused', 'absent') NOT NULL,
  verification_method ENUM('face', 'staff_verified', 'system') NOT NULL,
  checked_in_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attendance_id),
  UNIQUE KEY uq_attendance_session_student (session_id, student_user_id),
  KEY ix_attendance_records_status (attendance_status, session_id),
  KEY ix_attendance_records_student_time (student_user_id, checked_in_at),
  CONSTRAINT fk_attendance_records_session FOREIGN KEY (session_id) REFERENCES attendance_sessions (session_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_records_student FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_audit_logs (
  audit_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attendance_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  previous_status ENUM('present', 'late', 'excused', 'absent') NULL,
  new_status ENUM('present', 'late', 'excused', 'absent') NOT NULL,
  reason VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  KEY ix_attendance_audit_record_created (attendance_id, created_at),
  CONSTRAINT fk_attendance_audit_record FOREIGN KEY (attendance_id) REFERENCES attendance_records (attendance_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
