-- Use the final two digits of each academic year in nine-digit course numbers.
-- Example: 2026-2027, first semester, sequence 2063 becomes 262712063.
UPDATE course_offerings co
JOIN academic_terms t ON t.term_id = co.term_id
JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
SET co.course_number = CONCAT(
  SUBSTRING(ay.year_label, 3, 2),
  SUBSTRING(ay.year_label, 8, 2),
  CASE t.term_name WHEN '1st semester' THEN '1' WHEN '2nd semester' THEN '2' ELSE '0' END,
  RIGHT(co.course_number, 4)
)
WHERE co.course_number REGEXP '^[0-9]{9}$'
  AND ay.year_label REGEXP '^[0-9]{4}-[0-9]{4}$'
  AND LEFT(co.course_number, 4) = LEFT(ay.year_label, 4);
