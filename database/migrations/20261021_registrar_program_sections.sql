-- Add numeric course identifiers, three cohort sections, and program sample rosters.
ALTER TABLE campus_student_registry ADD COLUMN section_code CHAR(1) NULL AFTER year_level;
ALTER TABLE course_offerings ADD COLUMN course_number VARCHAR(20) NULL AFTER offering_id;
ALTER TABLE course_offerings ADD UNIQUE KEY uq_course_offerings_course_number (course_number);

CREATE TABLE IF NOT EXISTS student_section_assignments (
  student_user_id BIGINT UNSIGNED NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  section_code CHAR(1) NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_user_id, term_id),
  KEY ix_student_section_term (term_id, section_code),
  CONSTRAINT chk_student_section_code CHECK (section_code IN ('A', 'B', 'C')),
  CONSTRAINT fk_student_section_student FOREIGN KEY (student_user_id) REFERENCES student_profiles (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_section_term FOREIGN KEY (term_id) REFERENCES academic_terms (term_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_section_assigner FOREIGN KEY (assigned_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

UPDATE course_offerings co
JOIN academic_terms t ON t.term_id = co.term_id
JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
SET co.course_number = CONCAT(LEFT(ay.year_label, 4), CASE t.term_name WHEN '1st semester' THEN '1' WHEN '2nd semester' THEN '2' ELSE '0' END, LPAD(co.offering_id, 4, '0'))
WHERE co.course_number IS NULL;

-- The two retained demo roster entries belong to BSIT.
UPDATE campus_student_registry
SET program_id = 'IT-03', section_code = CASE student_number
  WHEN '202600001' THEN 'A'
  WHEN '202600002' THEN 'B'
END
WHERE student_number IN ('202600001', '202600002');
-- Keep existing student profiles aligned with the campus roster's assigned program and year.
UPDATE student_profiles sp
JOIN campus_student_registry r ON r.student_number = sp.student_number
SET sp.program_id = r.program_id, sp.year_level = r.year_level;
