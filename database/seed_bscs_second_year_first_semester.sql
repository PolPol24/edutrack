USE edutrack_db;

-- Add the second-year BSCS course offerings from the supplied schedule.
-- Existing course/enrollment history is preserved. Safe to run more than once.
START TRANSACTION;

INSERT INTO courses (course_id, course_code, course_title, units, department_id)
SELECT seed.course_id, seed.course_code, seed.course_title, seed.units, d.department_id
FROM (
  SELECT 'D-50' AS course_id, 'DCIT 50' AS course_code, 'Object Oriented Programming' AS course_title, 3 AS units, 'CS' AS department_code
  UNION ALL SELECT 'C-60', 'COSC 60', 'Digital Logic Design', 3, 'CS'
  UNION ALL SELECT 'C-55', 'COSC 55', 'Discrete Structures II', 3, 'CS'
  UNION ALL SELECT 'D-24', 'DCIT 24', 'Information Management', 3, 'CS'
  UNION ALL SELECT 'G-04', 'GNED 04', 'Mga Babasahin Hinggil sa Kasaysayan ng Pilipinas', 3, 'GE'
  UNION ALL SELECT 'F-03', 'FITT 3', 'Physical Activities Toward Health and Fitness 1', 2, 'GE'
  UNION ALL SELECT 'M-01', 'MATH 1', 'Analytic Geometry', 3, 'GE'
  UNION ALL SELECT 'I-50', 'INSY 50', 'Fundamentals of Information System', 3, 'CS'
) AS seed
JOIN departments d ON d.department_code = seed.department_code
ON DUPLICATE KEY UPDATE
  course_title = VALUES(course_title), units = VALUES(units), department_id = VALUES(department_id);

INSERT INTO program_courses (program_id, course_id, recommended_year)
SELECT p.program_id, c.course_id, 2
FROM programs p
CROSS JOIN courses c
WHERE p.program_code = 'BSCS'
  AND c.course_code IN ('DCIT 50', 'COSC 60', 'COSC 55', 'DCIT 24', 'GNED 04', 'FITT 3', 'MATH 1', 'INSY 50')
ON DUPLICATE KEY UPDATE recommended_year = VALUES(recommended_year);

-- Instructor choices are distributed between the two faculty demo accounts.
-- Assignments belong to these new class offerings only.
INSERT INTO course_offerings (course_id, term_id, section_code, faculty_user_id, capacity)
SELECT c.course_id, t.term_id, seed.section_code, u.user_id, 40
FROM (
  SELECT 'BSCS-2C' AS section_code, 'DCIT 50' AS course_code, 'lord.toletole@edutrack.edu' AS faculty_email
  UNION ALL SELECT 'BSCS-2C', 'COSC 60', 'faculty@edutrack.edu'
  UNION ALL SELECT 'BSCS-2C', 'COSC 55', 'lord.toletole@edutrack.edu'
  UNION ALL SELECT 'BSCS-2C', 'DCIT 24', 'faculty@edutrack.edu'
  UNION ALL SELECT 'BSCS-2C', 'GNED 04', 'lord.toletole@edutrack.edu'
  UNION ALL SELECT 'BSCS-2C', 'FITT 3', 'faculty@edutrack.edu'
  UNION ALL SELECT 'BSCS-2C', 'MATH 1', 'faculty@edutrack.edu'
  UNION ALL SELECT 'BSCS-2C', 'INSY 50', 'lord.toletole@edutrack.edu'
  UNION ALL SELECT 'BSCS-2D', 'MATH 1', 'lord.toletole@edutrack.edu'
  UNION ALL SELECT 'BSCS-2D', 'FITT 3', 'faculty@edutrack.edu'
  UNION ALL SELECT 'BSCS-2D', 'INSY 50', 'lord.toletole@edutrack.edu'
  UNION ALL SELECT 'BSCS-2D', 'COSC 55', 'faculty@edutrack.edu'
  UNION ALL SELECT 'BSCS-2D', 'DCIT 50', 'lord.toletole@edutrack.edu'
  UNION ALL SELECT 'BSCS-2D', 'DCIT 24', 'faculty@edutrack.edu'
  UNION ALL SELECT 'BSCS-2D', 'COSC 60', 'lord.toletole@edutrack.edu'
) AS seed
JOIN courses c ON c.course_code = seed.course_code
JOIN academic_terms t ON t.term_status = 'active'
JOIN users u ON u.email = seed.faculty_email AND u.role = 'faculty' AND u.account_status = 'active'
ON DUPLICATE KEY UPDATE offering_status = 'open';

INSERT INTO class_meetings (offering_id, day_of_week, start_time, end_time, room)
SELECT co.offering_id, seed.day_of_week, seed.start_time, seed.end_time, seed.room
FROM (
  SELECT 'BSCS-2C' AS section_code, 'GNED 04' AS course_code, 'tuesday' AS day_of_week, '11:00:00' AS start_time, '12:30:00' AS end_time, 'RM 333A' AS room
  UNION ALL SELECT 'BSCS-2C', 'DCIT 50', 'wednesday', '07:00:00', '09:00:00', 'RM 334B'
  UNION ALL SELECT 'BSCS-2C', 'DCIT 24', 'wednesday', '13:00:00', '15:00:00', 'CL 2'
  UNION ALL SELECT 'BSCS-2C', 'COSC 60', 'thursday', '07:00:00', '09:00:00', 'RM 334A'
  UNION ALL SELECT 'BSCS-2C', 'FITT 3', 'thursday', '12:00:00', '14:00:00', 'GYM'
  UNION ALL SELECT 'BSCS-2C', 'COSC 55', 'saturday', '07:00:00', '08:00:00', 'RM 225'
  UNION ALL SELECT 'BSCS-2C', 'DCIT 24', 'saturday', '09:00:00', '11:00:00', 'RM 224'
  UNION ALL SELECT 'BSCS-2C', 'MATH 1', 'tuesday', '15:30:00', '16:30:00', 'RM 333B'
  UNION ALL SELECT 'BSCS-2C', 'INSY 50', 'tuesday', '16:30:00', '18:00:00', 'RM 334A'
  UNION ALL SELECT 'BSCS-2D', 'MATH 1', 'monday', '07:00:00', '09:00:00', 'RM 114'
  UNION ALL SELECT 'BSCS-2D', 'COSC 55', 'wednesday', '09:00:00', '11:00:00', 'RM 225'
  UNION ALL SELECT 'BSCS-2D', 'DCIT 50', 'wednesday', '12:30:00', '14:30:00', 'RM 334B'
  UNION ALL SELECT 'BSCS-2D', 'DCIT 50', 'wednesday', '14:30:00', '15:30:00', 'CL 1'
  UNION ALL SELECT 'BSCS-2D', 'FITT 3', 'tuesday', '14:00:00', '16:00:00', 'GYM'
  UNION ALL SELECT 'BSCS-2D', 'INSY 50', 'tuesday', '16:30:00', '18:00:00', 'RM 333A'
  UNION ALL SELECT 'BSCS-2D', 'INSY 50', 'wednesday', '16:30:00', '18:00:00', 'RM 223'
  UNION ALL SELECT 'BSCS-2D', 'DCIT 24', 'friday', '09:00:00', '11:00:00', 'RM 334A'
  UNION ALL SELECT 'BSCS-2D', 'DCIT 24', 'friday', '12:30:00', '14:00:00', 'CL 4'
  UNION ALL SELECT 'BSCS-2D', 'COSC 60', 'saturday', '07:00:00', '08:00:00', 'RM 224'
  UNION ALL SELECT 'BSCS-2D', 'COSC 60', 'saturday', '09:00:00', '11:00:00', 'CL 4'
) AS seed
JOIN courses c ON c.course_code = seed.course_code
JOIN academic_terms t ON t.term_status = 'active'
JOIN course_offerings co ON co.course_id = c.course_id AND co.term_id = t.term_id AND co.section_code = seed.section_code
WHERE NOT EXISTS (
  SELECT 1 FROM class_meetings existing
  WHERE existing.offering_id = co.offering_id
    AND existing.day_of_week = seed.day_of_week
    AND existing.start_time = seed.start_time
    AND existing.end_time = seed.end_time
    AND existing.room <=> seed.room
);

COMMIT;
