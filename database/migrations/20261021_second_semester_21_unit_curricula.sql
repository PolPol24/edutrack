-- Seed Year 1 second-semester curriculum samples for BSIT, BSIS, and BSCS.
INSERT INTO courses (course_id, course_code, course_title, units, department_id)
SELECT seed.course_id, seed.course_code, seed.course_title, seed.units, departments.department_id
FROM (
  SELECT 'G-02' AS course_id, 'GNED 02' AS course_code, 'Ethics' AS course_title, 3 AS units, 'GE' AS department_code
  UNION ALL SELECT 'G-04', 'GNED 04', 'Mga Babasahin Hinggil sa Kasaysayan ng Pilipinas', 3, 'GE'
  UNION ALL SELECT 'G-07', 'GNED 07', 'Art Appreciation', 3, 'GE'
  UNION ALL SELECT 'G-08', 'GNED 08', 'The Contemporary World', 3, 'GE'
  UNION ALL SELECT 'G-11', 'GNED 11', 'Kontekstwalisadong Komunikasyon sa Filipino', 3, 'GE'
  UNION ALL SELECT 'P-02', 'PATHFIT 2', 'Physical Activities Toward Health and Fitness 2', 2, 'GE'
  UNION ALL SELECT 'D-22', 'DCIT 22', 'Computer Programming 1', 3, 'CS'
  UNION ALL SELECT 'D-23', 'DCIT 23', 'Data Structures and Algorithms', 3, 'IT'
  UNION ALL SELECT 'I-52', 'INSY 52', 'Systems Analysis and Design', 3, 'IS'
  UNION ALL SELECT 'I-53', 'INSY 53', 'Database Management Systems', 3, 'IS'
  UNION ALL SELECT 'C-21', 'COSC 21', 'Object-Oriented Programming', 3, 'CS'
  UNION ALL SELECT 'C-22', 'COSC 22', 'Data Structures and Algorithms', 3, 'CS'
  UNION ALL SELECT 'G-01', 'GNED 01', 'Mathematics in the Modern World', 3, 'GE'
  UNION ALL SELECT 'G-03', 'GNED 03', 'Understanding the Self', 3, 'GE'
  UNION ALL SELECT 'G-06', 'GNED 06', 'Science, Technology, and Society', 3, 'GE'
) AS seed
JOIN departments ON departments.department_code = seed.department_code
ON DUPLICATE KEY UPDATE
  course_title = VALUES(course_title),
  units = VALUES(units),
  department_id = VALUES(department_id);

-- Five three-unit general education subjects, two-unit PE, and two three-unit
-- program subjects give each course a 23-unit first-year second semester.
INSERT INTO program_courses (program_id, course_id, recommended_year, recommended_semester)
SELECT programs.program_id, courses.course_id, 1, 2
FROM (
  SELECT 'BSIT' AS program_code, 'GNED 02' AS course_code
  UNION ALL SELECT 'BSIT', 'GNED 04'
  UNION ALL SELECT 'BSIT', 'GNED 07'
  UNION ALL SELECT 'BSIT', 'GNED 08'
  UNION ALL SELECT 'BSIT', 'GNED 11'
  UNION ALL SELECT 'BSIT', 'PATHFIT 2'
  UNION ALL SELECT 'BSIS', 'GNED 02'
  UNION ALL SELECT 'BSIS', 'GNED 04'
  UNION ALL SELECT 'BSIS', 'GNED 07'
  UNION ALL SELECT 'BSIS', 'GNED 08'
  UNION ALL SELECT 'BSIS', 'GNED 11'
  UNION ALL SELECT 'BSIS', 'PATHFIT 2'
  UNION ALL SELECT 'BSCS', 'GNED 01'
  UNION ALL SELECT 'BSCS', 'GNED 03'
  UNION ALL SELECT 'BSCS', 'GNED 04'
  UNION ALL SELECT 'BSCS', 'GNED 06'
  UNION ALL SELECT 'BSCS', 'GNED 07'
  UNION ALL SELECT 'BSCS', 'PATHFIT 2'
) AS seed
JOIN programs ON programs.program_code = seed.program_code
JOIN courses ON courses.course_code = seed.course_code
ON DUPLICATE KEY UPDATE
  is_required = TRUE,
  recommended_year = 1,
  recommended_semester = 2;

INSERT INTO program_courses (program_id, course_id, recommended_year, recommended_semester)
SELECT programs.program_id, courses.course_id, 1, 2
FROM (
  SELECT 'BSIT' AS program_code, 'DCIT 22' AS course_code
  UNION ALL SELECT 'BSIT', 'DCIT 23'
  UNION ALL SELECT 'BSIS', 'INSY 52'
  UNION ALL SELECT 'BSIS', 'INSY 53'
  UNION ALL SELECT 'BSCS', 'COSC 21'
  UNION ALL SELECT 'BSCS', 'COSC 22'
) AS seed
JOIN programs ON programs.program_code = seed.program_code
JOIN courses ON courses.course_code = seed.course_code
ON DUPLICATE KEY UPDATE
  is_required = TRUE,
  recommended_year = 1,
  recommended_semester = 2;
