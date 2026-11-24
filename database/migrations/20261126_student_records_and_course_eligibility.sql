-- Separate registrar-owned academic records from student login accounts.
CREATE TABLE IF NOT EXISTS student_records (
  user_id BIGINT UNSIGNED NOT NULL,
  student_number VARCHAR(30) NOT NULL,
  program_id VARCHAR(10) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  student_status ENUM('active', 'on_leave', 'graduated', 'withdrawn') NOT NULL DEFAULT 'active',
  is_irregular BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_student_records_number (student_number),
  KEY ix_student_records_program_year (program_id, year_level, student_status),
  CONSTRAINT chk_student_records_year CHECK (year_level BETWEEN 1 AND 4),
  CONSTRAINT fk_student_records_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_records_program FOREIGN KEY (program_id) REFERENCES programs (program_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO student_records (user_id, student_number, program_id, year_level, student_status)
SELECT user_id, student_number, program_id, year_level, COALESCE(student_status, 'active')
FROM users
WHERE role = 'student' AND student_number IS NOT NULL AND program_id IS NOT NULL AND year_level IS NOT NULL;

CREATE TABLE IF NOT EXISTS course_prerequisites (
  program_id VARCHAR(10) NOT NULL,
  course_id VARCHAR(10) NOT NULL,
  prerequisite_course_id VARCHAR(10) NOT NULL,
  PRIMARY KEY (program_id, course_id, prerequisite_course_id),
  CONSTRAINT fk_course_prereq_program FOREIGN KEY (program_id) REFERENCES programs (program_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_course_prereq_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_course_prereq_required FOREIGN KEY (prerequisite_course_id) REFERENCES courses (course_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS student_course_results (
  result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_user_id BIGINT UNSIGNED NOT NULL,
  course_id VARCHAR(10) NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  result_status ENUM('passed', 'failed', 'incomplete') NOT NULL,
  recorded_by_user_id BIGINT UNSIGNED NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (result_id),
  UNIQUE KEY uq_student_course_result (student_user_id, course_id, term_id),
  CONSTRAINT fk_student_result_student FOREIGN KEY (student_user_id) REFERENCES student_records (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_result_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_result_term FOREIGN KEY (term_id) REFERENCES academic_terms (term_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_result_recorder FOREIGN KEY (recorded_by_user_id) REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
