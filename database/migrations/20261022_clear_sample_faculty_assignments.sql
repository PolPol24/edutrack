-- Demo seed scripts assigned instructors directly to legacy compact section codes.
-- Registrar-created offerings use hyphenated section codes (for example BSIT-1-A),
-- so those assignments are preserved.
UPDATE course_offerings co
JOIN users u ON u.user_id = co.faculty_user_id
SET co.faculty_user_id = NULL
WHERE u.role = 'faculty'
  AND u.email IN ('faculty@edutrack.edu', 'lord.toletole@edutrack.edu')
  AND co.section_code IN ('BSIT-1A', 'BSCS-1B', 'BSCS-2C', 'BSCS-2D', 'BSCS-3D');

-- Older demo sections were later normalized to hyphenated codes. Clear only
-- the sample course groups and faculty originally assigned by setup_demo.php.
UPDATE course_offerings co
JOIN users u ON u.user_id = co.faculty_user_id
JOIN courses c ON c.course_id = co.course_id
SET co.faculty_user_id = NULL
WHERE (
    (u.email = 'lord.toletole@edutrack.edu'
      AND co.section_code IN ('BSCS-2-C', 'BSCS-3-D')
      AND c.course_code IN ('COSC 80', 'DCIT 26', 'COSC 85', 'DCIT 65', 'COSC 75', 'COSC 101', 'MATH 3'))
    OR
    (u.email = 'faculty@edutrack.edu'
      AND co.section_code = 'BSIT-1-A'
      AND c.course_code IN ('COSC 80', 'DCIT 26', 'COSC 85', 'DCIT 65', 'COSC 75', 'COSC 101', 'MATH 3'))
  );
