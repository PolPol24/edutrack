-- Demo curriculum year placement used to filter the student catalog and class list.
UPDATE program_courses pc
JOIN programs p ON p.program_id = pc.program_id
JOIN courses c ON c.course_id = pc.course_id
JOIN (
  SELECT 'BSCS' AS program_code, 'COSC 80' AS course_code, 3 AS recommended_year
  UNION ALL SELECT 'BSCS', 'DCIT 26', 3
  UNION ALL SELECT 'BSCS', 'COSC 85', 3
  UNION ALL SELECT 'BSCS', 'DCIT 65', 3
  UNION ALL SELECT 'BSCS', 'COSC 75', 3
  UNION ALL SELECT 'BSCS', 'COSC 101', 3
  UNION ALL SELECT 'BSCS', 'MATH 3', 3
  UNION ALL SELECT 'BSIT', 'COSC 80', 3
  UNION ALL SELECT 'BSIT', 'DCIT 26', 3
  UNION ALL SELECT 'BSIT', 'COSC 85', 3
  UNION ALL SELECT 'BSIT', 'DCIT 65', 3
  UNION ALL SELECT 'BSIT', 'COSC 75', 3
  UNION ALL SELECT 'BSIT', 'COSC 101', 3
  UNION ALL SELECT 'BSIT', 'MATH 3', 3
) AS year_map ON year_map.program_code = p.program_code
  AND year_map.course_code = c.course_code
SET pc.recommended_year = year_map.recommended_year;
