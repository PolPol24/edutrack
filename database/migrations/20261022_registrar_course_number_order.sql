-- Begin the first-semester course number series with Discrete Structures
-- (COSC 50), followed by other subjects in a stable course/section order.
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
         ) AS assigned_course_number
  FROM course_offerings co
  JOIN courses c ON c.course_id = co.course_id
  JOIN academic_terms t ON t.term_id = co.term_id
  JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
) numbered ON numbered.offering_id = co.offering_id
SET co.course_number = numbered.assigned_course_number;
