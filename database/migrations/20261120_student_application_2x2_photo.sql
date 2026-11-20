CREATE TABLE IF NOT EXISTS student_registration_request_photos (
  request_id BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_filename VARCHAR(40) NOT NULL,
  mime_type VARCHAR(30) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_registration_request_photo_storage (storage_filename),
  CONSTRAINT fk_registration_request_photos_request
    FOREIGN KEY (request_id) REFERENCES student_registration_requests (request_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;