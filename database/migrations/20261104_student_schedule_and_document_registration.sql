CREATE TABLE IF NOT EXISTS class_meetings (
  meeting_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  offering_id BIGINT UNSIGNED NOT NULL,
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(100) NULL,
  PRIMARY KEY (meeting_id),
  KEY ix_meetings_offering_day (offering_id, day_of_week),
  CONSTRAINT chk_class_meeting_time CHECK (end_time > start_time),
  CONSTRAINT fk_meetings_offering
    FOREIGN KEY (offering_id) REFERENCES course_offerings (offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_document_registration_requests (
  request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_user_id BIGINT UNSIGNED NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  request_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  decision_note VARCHAR(500) NULL,
  PRIMARY KEY (request_id),
  KEY ix_student_doc_requests_status_date (request_status, submitted_at),
  KEY ix_student_doc_requests_student_term (student_user_id, term_id),
  CONSTRAINT fk_student_doc_requests_student FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_doc_requests_term FOREIGN KEY (term_id) REFERENCES academic_terms (term_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_doc_requests_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_registration_documents (
  document_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_filename CHAR(36) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id),
  UNIQUE KEY uq_registration_document_slot (request_id, slot_number),
  UNIQUE KEY uq_registration_document_storage (storage_filename),
  CONSTRAINT chk_registration_document_slot CHECK (slot_number BETWEEN 1 AND 3),
  CONSTRAINT fk_registration_documents_request FOREIGN KEY (request_id) REFERENCES student_document_registration_requests (request_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
