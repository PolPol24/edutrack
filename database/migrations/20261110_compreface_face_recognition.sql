CREATE TABLE IF NOT EXISTS compreface_student_faces (
  student_user_id BIGINT UNSIGNED NOT NULL,
  compreface_subject VARCHAR(100) NOT NULL,
  template_status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  consent_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_user_id),
  UNIQUE KEY uq_compreface_student_subject (compreface_subject),
  KEY ix_compreface_student_faces_status (template_status),
  CONSTRAINT fk_compreface_student_faces_student FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pending_compreface_student_faces (
  request_id BIGINT UNSIGNED NOT NULL,
  compreface_subject VARCHAR(100) NOT NULL,
  consent_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_pending_compreface_subject (compreface_subject),
  CONSTRAINT fk_pending_compreface_student_faces_request FOREIGN KEY (request_id) REFERENCES student_registration_requests (request_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
