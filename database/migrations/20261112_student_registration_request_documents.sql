CREATE TABLE IF NOT EXISTS student_registration_request_documents (
  document_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_filename VARCHAR(40) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id),
  UNIQUE KEY uq_registration_request_document_slot (request_id, slot_number),
  UNIQUE KEY uq_registration_request_document_storage (storage_filename),
  CONSTRAINT chk_registration_request_document_slot CHECK (slot_number BETWEEN 1 AND 3),
  CONSTRAINT fk_registration_request_documents_request
    FOREIGN KEY (request_id) REFERENCES student_registration_requests (request_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
