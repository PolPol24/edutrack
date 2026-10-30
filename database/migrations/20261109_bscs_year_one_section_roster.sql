-- Seed one fictional campus roster student in each first-year BSCS section.
-- Students can register with these identity details and complete face enrollment.
INSERT IGNORE INTO campus_student_registry
  (student_number, first_name, last_name, student_email, name_suffix, date_of_birth, program_id, year_level, section_code)
SELECT samples.student_number, samples.first_name, samples.last_name,
       samples.student_email, NULL, samples.date_of_birth, p.program_id, 1,
       samples.section_code
FROM programs p
CROSS JOIN (
  SELECT '202611101' AS student_number, 'Avery' AS first_name, 'Demo' AS last_name,
         'bscs1a.demo@edutrack.edu' AS student_email, '2007-01-12' AS date_of_birth, 'A' AS section_code
  UNION ALL
  SELECT '202611102', 'Blair', 'Demo', 'bscs1b.demo@edutrack.edu', '2007-03-08', 'B'
  UNION ALL
  SELECT '202611103', 'Casey', 'Demo', 'bscs1c.demo@edutrack.edu', '2007-06-21', 'C'
) AS samples
WHERE p.program_code = 'BSCS';
