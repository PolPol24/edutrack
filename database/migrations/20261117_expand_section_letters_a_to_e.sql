ALTER TABLE student_section_assignments
  DROP CONSTRAINT chk_student_section_code;

ALTER TABLE student_section_assignments
  ADD CONSTRAINT chk_student_section_code
    CHECK (section_code IN ('A', 'B', 'C', 'D', 'E'));
