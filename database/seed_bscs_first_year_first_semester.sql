USE edutrack_db;

-- Add BSCS first-year section B using the supplied first-semester schedule.
-- Existing enrollment and course history is preserved. Safe to rerun.
START TRANSACTION;

UPDATE courses
SET course_code = 'PATHFIT 1', course_title = 'Physical Activities Toward Health and Fitness 1'
WHERE course_id = 'P-01' AND course_code = 'PATHEFT 1';

INSERT INTO course_offerings (course_id, term_id, section_code, faculty_user_id, capacity)
SELECT c.course_id, t.term_id, seed.section_code, NULL, 40
FROM (
  SELECT 'BSCS-1B' AS section_code, 'GNED 05' AS course_code
  UNION ALL SELECT 'BSCS-1B', 'DCIT 22'
  UNION ALL SELECT 'BSCS-1B', 'GNED 11'
  UNION ALL SELECT 'BSCS-1B', 'COSC 50'
  UNION ALL SELECT 'BSCS-1B', 'CvSU 101'
  UNION ALL SELECT 'BSCS-1B', 'GNED 02'
  UNION ALL SELECT 'BSCS-1B', 'PATHFIT 1'
  UNION ALL SELECT 'BSCS-1B', 'DCIT 21'
) AS seed
JOIN courses c ON c.course_code = seed.course_code
JOIN academic_terms t ON t.term_status = 'active'
ON DUPLICATE KEY UPDATE offering_status = 'open', faculty_user_id = NULL;

INSERT INTO class_meetings (offering_id, day_of_week, start_time, end_time, room)
SELECT co.offering_id, seed.day_of_week, seed.start_time, seed.end_time, seed.room
FROM (
  SELECT 'GNED 05' AS course_code, 'monday' AS day_of_week, '09:00:00' AS start_time, '10:30:00' AS end_time, 'RM 351' AS room
  UNION ALL SELECT 'DCIT 22', 'monday', '13:00:00', '15:30:00', 'CL 1'
  UNION ALL SELECT 'COSC 50', 'monday', '16:00:00', '18:00:00', 'RM 313'
  UNION ALL SELECT 'CvSU 101', 'monday', '18:00:00', '19:00:00', 'RM 334A'
  UNION ALL SELECT 'DCIT 22', 'thursday', '07:00:00', '09:30:00', 'CL 3'
  UNION ALL SELECT 'DCIT 22', 'thursday', '09:30:00', '10:30:00', 'RM 334B'
  UNION ALL SELECT 'GNED 11', 'thursday', '10:30:00', '12:30:00', 'RM 115'
  UNION ALL SELECT 'PATHFIT 1', 'thursday', '14:00:00', '16:00:00', 'TYM'
  UNION ALL SELECT 'GNED 02', 'friday', '10:00:00', '12:00:00', 'RM 313'
  UNION ALL SELECT 'DCIT 21', 'friday', '14:00:00', '16:00:00', 'RM 333B'
  UNION ALL SELECT 'DCIT 21', 'friday', '16:30:00', '18:30:00', 'CL 1'
) AS seed
JOIN courses c ON c.course_code = seed.course_code
JOIN academic_terms t ON t.term_status = 'active'
JOIN course_offerings co ON co.course_id = c.course_id AND co.term_id = t.term_id AND co.section_code = 'BSCS-1B'
WHERE NOT EXISTS (
  SELECT 1 FROM class_meetings existing
  WHERE existing.offering_id = co.offering_id
    AND existing.day_of_week = seed.day_of_week
    AND existing.start_time = seed.start_time
    AND existing.end_time = seed.end_time
    AND existing.room <=> seed.room
);

COMMIT;
