-- Add institutional contact emails to the campus identity lookup roster.
ALTER TABLE campus_student_registry
  ADD COLUMN student_email VARCHAR(254) NULL AFTER last_name;

UPDATE campus_student_registry
SET student_email = CONCAT(
  LOWER(first_name), '.', LOWER(REPLACE(last_name, ' ', '')), '@cvsu.edu.ph'
);

ALTER TABLE campus_student_registry
  MODIFY COLUMN student_email VARCHAR(254) NOT NULL,
  ADD UNIQUE KEY uq_campus_registry_email (student_email);
