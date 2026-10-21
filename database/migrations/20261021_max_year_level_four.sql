-- Limit student and course year levels to the four-year range used by EduTrack.
ALTER TABLE student_profiles DROP CONSTRAINT chk_student_year_level;
ALTER TABLE student_profiles
  ADD CONSTRAINT chk_student_year_level CHECK (year_level BETWEEN 1 AND 4);

ALTER TABLE program_courses DROP CONSTRAINT chk_program_course_year;
ALTER TABLE program_courses
  ADD CONSTRAINT chk_program_course_year
  CHECK (recommended_year IS NULL OR recommended_year BETWEEN 1 AND 4);
