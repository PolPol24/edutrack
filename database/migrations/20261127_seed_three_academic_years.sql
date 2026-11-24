-- Add the next three academic years and their two semesters.
INSERT IGNORE INTO academic_years (year_label, start_date, end_date, is_current) VALUES
  ('2027-2028', '2027-08-01', '2028-06-30', FALSE),
  ('2028-2029', '2028-08-01', '2029-06-30', FALSE),
  ('2029-2030', '2029-08-01', '2030-06-30', FALSE);

INSERT IGNORE INTO academic_terms
  (academic_year_id, term_name, start_date, end_date, enrollment_start, enrollment_end, term_status)
SELECT academic_year_id, '1st semester', '2027-08-01', '2027-12-20', '2027-07-01', '2027-08-15', 'upcoming'
FROM academic_years WHERE year_label = '2027-2028';
INSERT IGNORE INTO academic_terms
  (academic_year_id, term_name, start_date, end_date, enrollment_start, enrollment_end, term_status)
SELECT academic_year_id, '2nd semester', '2028-01-05', '2028-05-30', '2027-12-01', '2028-01-15', 'upcoming'
FROM academic_years WHERE year_label = '2027-2028';

INSERT IGNORE INTO academic_terms
  (academic_year_id, term_name, start_date, end_date, enrollment_start, enrollment_end, term_status)
SELECT academic_year_id, '1st semester', '2028-08-01', '2028-12-20', '2028-07-01', '2028-08-15', 'upcoming'
FROM academic_years WHERE year_label = '2028-2029';
INSERT IGNORE INTO academic_terms
  (academic_year_id, term_name, start_date, end_date, enrollment_start, enrollment_end, term_status)
SELECT academic_year_id, '2nd semester', '2029-01-05', '2029-05-30', '2028-12-01', '2029-01-15', 'upcoming'
FROM academic_years WHERE year_label = '2028-2029';

INSERT IGNORE INTO academic_terms
  (academic_year_id, term_name, start_date, end_date, enrollment_start, enrollment_end, term_status)
SELECT academic_year_id, '1st semester', '2029-08-01', '2029-12-20', '2029-07-01', '2029-08-15', 'upcoming'
FROM academic_years WHERE year_label = '2029-2030';
INSERT IGNORE INTO academic_terms
  (academic_year_id, term_name, start_date, end_date, enrollment_start, enrollment_end, term_status)
SELECT academic_year_id, '2nd semester', '2030-01-05', '2030-05-30', '2029-12-01', '2030-01-15', 'upcoming'
FROM academic_years WHERE year_label = '2029-2030';
