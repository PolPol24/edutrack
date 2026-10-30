-- Campus roster used only to validate student registration requests.
CREATE TABLE IF NOT EXISTS campus_student_registry (
  student_number VARCHAR(30) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  name_suffix VARCHAR(20) NULL,
  date_of_birth DATE NOT NULL,
  program_id VARCHAR(10) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_number),
  KEY ix_campus_registry_program_year (program_id, year_level),
  CONSTRAINT chk_campus_registry_year CHECK (year_level BETWEEN 1 AND 4),
  CONSTRAINT fk_campus_registry_program FOREIGN KEY (program_id) REFERENCES programs (program_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO campus_student_registry (student_number, first_name, last_name, name_suffix, date_of_birth, program_id, year_level)
VALUES
  ('202600001', 'Ariana', 'Santos', NULL, '2001-01-01', 'IT-03', 1),
  ('202600002', 'Miguel', 'Reyes', NULL, '2002-02-04', 'IT-03', 2)
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), name_suffix = VALUES(name_suffix), date_of_birth = VALUES(date_of_birth), program_id = VALUES(program_id), year_level = VALUES(year_level);
