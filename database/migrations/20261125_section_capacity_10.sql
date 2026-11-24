ALTER TABLE course_offerings
  MODIFY capacity SMALLINT UNSIGNED NOT NULL DEFAULT 10;

UPDATE course_offerings
SET capacity = 10;
