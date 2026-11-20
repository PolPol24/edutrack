ALTER TABLE student_registration_requests
  ADD COLUMN processing_fee_receipt_required TINYINT(1) NOT NULL DEFAULT 0
  AFTER created_user_id;

CREATE TABLE IF NOT EXISTS student_registration_request_processing_fee_receipts (
  request_id BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_filename VARCHAR(40) NOT NULL,
  mime_type VARCHAR(30) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_registration_request_receipt_storage (storage_filename),
  CONSTRAINT fk_registration_request_receipt_request
    FOREIGN KEY (request_id) REFERENCES student_registration_requests (request_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
