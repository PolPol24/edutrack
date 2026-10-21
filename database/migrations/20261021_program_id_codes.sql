-- Convert numeric program IDs to the requested readable IDs while preserving
-- the existing programs, student assignments, and program-course links.
ALTER TABLE student_profiles DROP FOREIGN KEY fk_students_program;
ALTER TABLE program_courses DROP FOREIGN KEY fk_program_courses_program;

ALTER TABLE programs MODIFY program_id VARCHAR(10) NOT NULL;
ALTER TABLE student_profiles MODIFY program_id VARCHAR(10) NOT NULL;
ALTER TABLE program_courses MODIFY program_id VARCHAR(10) NOT NULL;

UPDATE programs
SET program_id = CASE program_code
  WHEN 'BSIS' THEN 'IS-01'
  WHEN 'BSCS' THEN 'CS-02'
  WHEN 'BSIT' THEN 'IT-03'
  ELSE program_id
END;

UPDATE student_profiles
SET program_id = CASE program_id
  WHEN '1' THEN 'IS-01'
  WHEN '2' THEN 'CS-02'
  WHEN '3' THEN 'IT-03'
  ELSE program_id
END;

UPDATE program_courses
SET program_id = CASE program_id
  WHEN '1' THEN 'IS-01'
  WHEN '2' THEN 'CS-02'
  WHEN '3' THEN 'IT-03'
  ELSE program_id
END;

ALTER TABLE student_profiles
  ADD CONSTRAINT fk_students_program FOREIGN KEY (program_id)
  REFERENCES programs (program_id) ON UPDATE CASCADE;
ALTER TABLE program_courses
  ADD CONSTRAINT fk_program_courses_program FOREIGN KEY (program_id)
  REFERENCES programs (program_id) ON UPDATE CASCADE;
