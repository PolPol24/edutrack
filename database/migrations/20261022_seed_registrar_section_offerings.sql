-- Align legacy section names with the registrar's program-year-letter format.
UPDATE course_offerings
SET section_code = CONCAT(LEFT(section_code, CHAR_LENGTH(section_code) - 1), '-', RIGHT(section_code, 1))
WHERE section_code REGEXP '^[A-Z]+-[1-4][A-C]$';

-- Create one offering for every required subject in each of sections A, B, and C.
INSERT INTO course_offerings (course_id, term_id, section_code, capacity, offering_status)
SELECT pc.course_id, t.term_id,
       CONCAT(p.program_code, '-', pc.recommended_year, '-', sections.section_letter),
       40, 'open'
FROM program_courses pc
JOIN programs p ON p.program_id = pc.program_id AND p.is_active = 1
JOIN courses c ON c.course_id = pc.course_id AND c.course_status = 'active'
JOIN academic_terms t ON t.term_status IN ('active', 'upcoming')
  AND t.term_name = CASE pc.recommended_semester WHEN 1 THEN '1st semester' WHEN 2 THEN '2nd semester' END
CROSS JOIN (SELECT 'A' AS section_letter UNION ALL SELECT 'B' UNION ALL SELECT 'C') sections
WHERE pc.is_required = 1 AND pc.recommended_semester IS NOT NULL
ON DUPLICATE KEY UPDATE offering_id = LAST_INSERT_ID(offering_id);

UPDATE course_offerings co
JOIN academic_terms t ON t.term_id = co.term_id
JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
SET co.course_number = CONCAT(
  LEFT(ay.year_label, 4),
  CASE t.term_name WHEN '1st semester' THEN '1' WHEN '2nd semester' THEN '2' ELSE '0' END,
  LPAD(co.offering_id, 4, '0')
)
WHERE co.course_number IS NULL;

-- Keep the Discrete Structures sample number stable at 202610001.
UPDATE course_offerings SET course_number = NULL;

UPDATE course_offerings co
JOIN (
  SELECT co.offering_id,
         CONCAT(
           LEFT(ay.year_label, 4),
           CASE t.term_name WHEN '1st semester' THEN '1' WHEN '2nd semester' THEN '2' ELSE '0' END,
           LPAD(ROW_NUMBER() OVER (
             PARTITION BY t.term_id
             ORDER BY CASE WHEN c.course_code = 'COSC 50' THEN 0 ELSE 1 END,
                      c.course_code, co.section_code
           ), 4, '0')
         ) AS course_number
  FROM course_offerings co
  JOIN courses c ON c.course_id = co.course_id
  JOIN academic_terms t ON t.term_id = co.term_id
  JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
) numbered ON numbered.offering_id = co.offering_id
SET co.course_number = numbered.course_number;
