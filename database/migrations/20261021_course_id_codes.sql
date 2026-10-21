-- Convert course IDs to an initial plus course number, preserving all direct
-- references from program_courses and course_offerings.
CREATE TEMPORARY TABLE course_id_code_map (
  old_course_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  new_course_id VARCHAR(10) NOT NULL
) ENGINE=MEMORY;

INSERT INTO course_id_code_map (old_course_id, new_course_id)
SELECT course_id,
  CONCAT(LEFT(course_code, 1), '-',
    CASE
      WHEN CHAR_LENGTH(SUBSTRING_INDEX(TRIM(course_code), ' ', -1)) = 1
        THEN CONCAT('0', SUBSTRING_INDEX(TRIM(course_code), ' ', -1))
      ELSE SUBSTRING_INDEX(TRIM(course_code), ' ', -1)
    END)
FROM courses;

ALTER TABLE program_courses DROP FOREIGN KEY fk_program_courses_course;
ALTER TABLE course_offerings DROP FOREIGN KEY fk_offerings_course;

ALTER TABLE courses MODIFY course_id VARCHAR(10) NOT NULL;
ALTER TABLE program_courses MODIFY course_id VARCHAR(10) NOT NULL;
ALTER TABLE course_offerings MODIFY course_id VARCHAR(10) NOT NULL;

UPDATE program_courses pc
JOIN course_id_code_map m ON pc.course_id = m.old_course_id
SET pc.course_id = m.new_course_id;

UPDATE course_offerings co
JOIN course_id_code_map m ON co.course_id = m.old_course_id
SET co.course_id = m.new_course_id;

UPDATE courses c
JOIN course_id_code_map m ON c.course_id = m.old_course_id
SET c.course_id = m.new_course_id;

ALTER TABLE program_courses
  ADD CONSTRAINT fk_program_courses_course FOREIGN KEY (course_id)
  REFERENCES courses (course_id) ON UPDATE CASCADE;
ALTER TABLE course_offerings
  ADD CONSTRAINT fk_offerings_course FOREIGN KEY (course_id)
  REFERENCES courses (course_id) ON UPDATE CASCADE;

DROP TEMPORARY TABLE course_id_code_map;
