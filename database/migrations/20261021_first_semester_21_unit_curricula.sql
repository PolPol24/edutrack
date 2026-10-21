-- Track semester placement for program curricula.
ALTER TABLE program_courses
  ADD COLUMN recommended_semester TINYINT UNSIGNED NULL AFTER recommended_year,
  ADD CONSTRAINT chk_program_course_semester
    CHECK (recommended_semester IS NULL OR recommended_semester BETWEEN 1 AND 2);

-- Keep the existing first-year BSCS sample sequence as its 21-unit first semester.
UPDATE program_courses
JOIN courses ON courses.course_id = program_courses.course_id
JOIN programs ON programs.program_id = program_courses.program_id
SET program_courses.recommended_semester = 1
WHERE programs.program_code = 'BSCS' AND program_courses.recommended_year = 1;

-- Add the first-semester subjects needed by the BSIT and BSIS sample curricula.
INSERT INTO courses (course_id, course_code, course_title, units, department_id)
SELECT seed.course_id, seed.course_code, seed.course_title, seed.units, departments.department_id
FROM (
  SELECT 'G-02' AS course_id, 'GNED 02' AS course_code, 'Ethics' AS course_title, 3 AS units, 'GE' AS department_code
  UNION ALL SELECT 'G-11', 'GNED 11', 'Kontekstwalisadong Komunikasyon sa Filipino', 3, 'GE'
  UNION ALL SELECT 'P-01', 'PATHFIT 1', 'Physical Activities Toward Health and Fitness 1', 2, 'GE'
  UNION ALL SELECT 'C-50', 'COSC 50', 'Discrete Structure', 3, 'CS'
  UNION ALL SELECT 'D-21', 'DCIT 21', 'Introduction to Computing', 3, 'CS'
  UNION ALL SELECT 'D-22', 'DCIT 22', 'Computer Programming 1', 3, 'CS'
  UNION ALL SELECT 'G-05', 'GNED 05', 'Purposive Communication', 3, 'GE'
  UNION ALL SELECT 'CV-101', 'CvSU 101', 'Institutional Orientation', 1, 'GE'
  UNION ALL SELECT 'I-50', 'INSY 50', 'Fundamentals of Information System', 3, 'IS'
  UNION ALL SELECT 'G-01', 'GNED 01', 'Mathematics in the Modern World', 3, 'GE'
  UNION ALL SELECT 'G-03', 'GNED 03', 'Understanding the Self', 3, 'GE'
  UNION ALL SELECT 'G-06', 'GNED 06', 'Science, Technology, and Society', 3, 'GE'
  UNION ALL SELECT 'I-51', 'INSY 51', 'Business Process and Information Systems', 3, 'IS'
  UNION ALL SELECT 'D-20', 'DCIT 20', 'Fundamentals of Programming', 3, 'IT'
) AS seed
JOIN departments ON departments.department_code = seed.department_code
ON DUPLICATE KEY UPDATE
  course_title = VALUES(course_title),
  units = VALUES(units),
  department_id = VALUES(department_id);

-- Shared first-semester foundation: 12 GE units + 2 PE units + 1 orientation unit.
INSERT INTO program_courses (program_id, course_id, recommended_year, recommended_semester)
SELECT programs.program_id, courses.course_id, 1, 1
FROM (
  SELECT 'BSIT' AS program_code, 'GNED 01' AS course_code
  UNION ALL SELECT 'BSIT', 'GNED 03'
  UNION ALL SELECT 'BSIT', 'GNED 05'
  UNION ALL SELECT 'BSIT', 'GNED 06'
  UNION ALL SELECT 'BSIT', 'PATHFIT 1'
  UNION ALL SELECT 'BSIT', 'CvSU 101'
  UNION ALL SELECT 'BSIS', 'GNED 01'
  UNION ALL SELECT 'BSIS', 'GNED 03'
  UNION ALL SELECT 'BSIS', 'GNED 05'
  UNION ALL SELECT 'BSIS', 'GNED 06'
  UNION ALL SELECT 'BSIS', 'PATHFIT 1'
  UNION ALL SELECT 'BSIS', 'CvSU 101'
) AS seed
JOIN programs ON programs.program_code = seed.program_code
JOIN courses ON courses.course_code = seed.course_code
ON DUPLICATE KEY UPDATE
  is_required = TRUE,
  recommended_year = 1,
  recommended_semester = 1;

INSERT INTO program_courses (program_id, course_id, recommended_year, recommended_semester)
SELECT programs.program_id, courses.course_id, 1, 1
FROM (
  SELECT 'BSCS' AS program_code, 'GNED 02' AS course_code
  UNION ALL SELECT 'BSCS', 'PATHFIT 1'
  UNION ALL SELECT 'BSCS', 'GNED 11'
  UNION ALL SELECT 'BSCS', 'COSC 50'
  UNION ALL SELECT 'BSCS', 'DCIT 21'
  UNION ALL SELECT 'BSCS', 'DCIT 22'
  UNION ALL SELECT 'BSCS', 'GNED 05'
  UNION ALL SELECT 'BSCS', 'CvSU 101'
) AS seed
JOIN programs ON programs.program_code = seed.program_code
JOIN courses ON courses.course_code = seed.course_code
ON DUPLICATE KEY UPDATE
  is_required = TRUE,
  recommended_year = 1,
  recommended_semester = 1;

-- Two three-unit introductory major subjects complete each program's 21 units.
INSERT INTO program_courses (program_id, course_id, recommended_year, recommended_semester)
SELECT programs.program_id, courses.course_id, 1, 1
FROM (
  SELECT 'BSIT' AS program_code, 'DCIT 20' AS course_code
  UNION ALL SELECT 'BSIT', 'DCIT 21'
  UNION ALL SELECT 'BSIS', 'INSY 50'
  UNION ALL SELECT 'BSIS', 'INSY 51'
) AS seed
JOIN programs ON programs.program_code = seed.program_code
JOIN courses ON courses.course_code = seed.course_code
ON DUPLICATE KEY UPDATE
  is_required = TRUE,
  recommended_year = 1,
  recommended_semester = 1;
