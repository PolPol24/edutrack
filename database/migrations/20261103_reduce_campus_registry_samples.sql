-- Keep the two demo students and their section assignments.
UPDATE campus_student_registry
SET program_id = 'IT-03',
    section_code = CASE student_number
      WHEN '202600001' THEN 'A'
      WHEN '202600002' THEN 'B'
    END
WHERE student_number IN ('202600001', '202600002');

-- Remove only the known sample cohorts, preserving roster entries tied to
-- active users or pending registration requests.
DELETE r
FROM campus_student_registry r
WHERE (
    r.student_number BETWEEN '202600001' AND '202600050'
    OR r.student_number BETWEEN '202610051' AND '202610150'
  )
  AND r.student_number NOT IN ('202600001', '202600002')
  AND NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.role = 'student' AND u.student_number = r.student_number
  )
  AND NOT EXISTS (
    SELECT 1
    FROM student_registration_requests request
    WHERE request.student_number = r.student_number
      AND request.request_status = 'pending'
  );
