ALTER TABLE student_registration_requests
  ADD COLUMN program_id VARCHAR(10) NULL AFTER date_of_birth,
  ADD COLUMN year_level TINYINT UNSIGNED NULL AFTER program_id,
  ADD KEY ix_registration_program_year (program_id, year_level),
  ADD CONSTRAINT chk_registration_year_level CHECK (year_level IS NULL OR year_level BETWEEN 1 AND 4),
  ADD CONSTRAINT fk_registration_program
    FOREIGN KEY (program_id) REFERENCES programs (program_id)
    ON UPDATE CASCADE ON DELETE RESTRICT;
