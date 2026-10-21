USE edutrack_db;

-- Ensure the existing third-year curriculum and BSCS-3D offerings are in
-- edutrack_db. This seed is safe to rerun and does not alter enrollment history.
START TRANSACTION;

INSERT INTO program_courses (program_id, course_id, recommended_year)
SELECT p.program_id, c.course_id, 3
FROM programs p
CROSS JOIN courses c
WHERE p.program_code IN ('BSCS', 'BSIT')
  AND c.course_code IN (
    'COSC 80', 'DCIT 26', 'COSC 85', 'DCIT 65',
    'COSC 75', 'COSC 101', 'MATH 3'
  )
ON DUPLICATE KEY UPDATE recommended_year = VALUES(recommended_year);

-- Faculty assignments alternate across the two demo faculty accounts.
-- The provided materials did not include a third-year timetable, so this seed
-- creates offerings without inventing class meeting times.
INSERT INTO course_offerings (course_id, term_id, section_code, faculty_user_id, capacity)
SELECT c.course_id, t.term_id, 'BSCS-3D', u.user_id, 40
FROM (
  SELECT 'COSC 80' AS course_code, 'lord.toletole@edutrack.edu' AS faculty_email
  UNION ALL SELECT 'DCIT 26', 'faculty@edutrack.edu'
  UNION ALL SELECT 'COSC 85', 'lord.toletole@edutrack.edu'
  UNION ALL SELECT 'DCIT 65', 'faculty@edutrack.edu'
  UNION ALL SELECT 'COSC 75', 'lord.toletole@edutrack.edu'
  UNION ALL SELECT 'COSC 101', 'faculty@edutrack.edu'
  UNION ALL SELECT 'MATH 3', 'lord.toletole@edutrack.edu'
) AS seed
JOIN courses c ON c.course_code = seed.course_code
JOIN academic_terms t ON t.term_status = 'active'
JOIN users u ON u.email = seed.faculty_email
  AND u.role = 'faculty' AND u.account_status = 'active'
JOIN employee_profiles ep ON ep.user_id = u.user_id
ON DUPLICATE KEY UPDATE
  faculty_user_id = VALUES(faculty_user_id),
  offering_status = 'open';

COMMIT;
