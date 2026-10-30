-- Add a weekly face-attendance trial class for the demo BSIT student.
-- Safe for an existing database; inserts only when the demo offering exists and the room is free.
INSERT INTO class_meetings (offering_id, day_of_week, start_time, end_time, room)
SELECT co.offering_id, 'friday', '16:30:00', '18:00:00', 'Room 201'
FROM course_offerings co
JOIN courses c ON c.course_id = co.course_id
JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = 'active'
WHERE co.section_code IN ('BSIT-1-A', 'BSIT-1A')
  AND c.course_code = 'DCIT 26'
  AND co.offering_status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM class_meetings cm
    WHERE cm.offering_id = co.offering_id
      AND cm.day_of_week = 'friday'
      AND cm.start_time = '16:30:00'
      AND cm.end_time = '18:00:00'
      AND cm.room = 'Room 201'
  )
  AND NOT EXISTS (
    SELECT 1 FROM class_meetings cm
    WHERE cm.room = 'Room 201'
      AND cm.day_of_week = 'friday'
      AND cm.start_time < '18:00:00'
      AND cm.end_time > '16:30:00'
  );
