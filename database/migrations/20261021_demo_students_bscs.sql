-- Align the three local demo student accounts with the BSCS course schedules.
-- This changes only their program assignment; year levels and enrollments remain.
UPDATE student_profiles sp
JOIN users u ON u.user_id = sp.user_id AND u.role = 'student'
JOIN programs p ON p.program_code = 'BSCS'
SET sp.program_id = p.program_id
WHERE u.email IN (
  'student@edutrack.edu',
  'rance@edutrack.edu',
  'pol.samsung@edutrack.edu'
);
