CREATE DATABASE IF NOT EXISTS edutrack_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE edutrack_db;

CREATE TABLE IF NOT EXISTS departments (
  department_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_code VARCHAR(20) NOT NULL,
  department_name VARCHAR(120) NOT NULL,
  college_name VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (department_id),
  UNIQUE KEY uq_departments_code (department_code),
  UNIQUE KEY uq_departments_name (department_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS programs (
  program_id VARCHAR(10) NOT NULL,
  program_code VARCHAR(20) NOT NULL,
  program_name VARCHAR(160) NOT NULL,
  department_id BIGINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (program_id),
  UNIQUE KEY uq_programs_code (program_code),
  UNIQUE KEY uq_programs_name (program_name),
  CONSTRAINT fk_programs_department
    FOREIGN KEY (department_id) REFERENCES departments (department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS academic_years (
  academic_year_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  year_label VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (academic_year_id),
  UNIQUE KEY uq_academic_years_label (year_label),
  CONSTRAINT chk_academic_year_dates CHECK (end_date > start_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS academic_terms (
  term_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  term_name VARCHAR(40) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  enrollment_start DATE NULL,
  enrollment_end DATE NULL,
  term_status ENUM('upcoming', 'active', 'completed') NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (term_id),
  UNIQUE KEY uq_terms_year_name (academic_year_id, term_name),
  CONSTRAINT chk_term_dates CHECK (end_date > start_date),
  CONSTRAINT chk_term_enrollment_dates CHECK (
    enrollment_start IS NULL OR enrollment_end IS NULL OR enrollment_end >= enrollment_start
  ),
  CONSTRAINT fk_terms_academic_year
    FOREIGN KEY (academic_year_id) REFERENCES academic_years (academic_year_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  address VARCHAR(255) NULL,
  role ENUM('student', 'faculty', 'registrar', 'admin') NOT NULL,
  account_status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role_status (role, account_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  student_number VARCHAR(30) NOT NULL,
  program_id VARCHAR(10) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  student_status ENUM('active', 'on_leave', 'graduated', 'withdrawn') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_students_number (student_number),
  KEY ix_students_program_status (program_id, student_status),
  CONSTRAINT chk_student_year_level CHECK (year_level BETWEEN 1 AND 4),
  CONSTRAINT fk_students_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_students_program
    FOREIGN KEY (program_id) REFERENCES programs (program_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employee_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  employee_number VARCHAR(30) NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  office VARCHAR(160) NULL,
  hire_date DATE NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_employees_number (employee_number),
  KEY ix_employees_department (department_id),
  CONSTRAINT fk_employees_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_employees_department
    FOREIGN KEY (department_id) REFERENCES departments (department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
  course_id VARCHAR(10) NOT NULL,
  course_code VARCHAR(20) NOT NULL,
  course_title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  units TINYINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  course_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id),
  UNIQUE KEY uq_courses_code (course_code),
  KEY ix_courses_status (course_status),
  CONSTRAINT chk_course_units CHECK (units BETWEEN 1 AND 6),
  CONSTRAINT fk_courses_department
    FOREIGN KEY (department_id) REFERENCES departments (department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS program_courses (
  program_id VARCHAR(10) NOT NULL,
  course_id VARCHAR(10) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  recommended_year TINYINT UNSIGNED NULL,
  PRIMARY KEY (program_id, course_id),
  CONSTRAINT chk_program_course_year CHECK (
    recommended_year IS NULL OR recommended_year BETWEEN 1 AND 4
  ),
  CONSTRAINT fk_program_courses_program
    FOREIGN KEY (program_id) REFERENCES programs (program_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_program_courses_course
    FOREIGN KEY (course_id) REFERENCES courses (course_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_offerings (
  offering_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id VARCHAR(10) NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  section_code VARCHAR(30) NOT NULL,
  faculty_user_id BIGINT UNSIGNED NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 40,
  offering_status ENUM('open', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (offering_id),
  UNIQUE KEY uq_offering_term_section (course_id, term_id, section_code),
  UNIQUE KEY uq_offering_id_term (offering_id, term_id),
  KEY ix_offerings_faculty_term (faculty_user_id, term_id),
  KEY ix_offerings_term_status (term_id, offering_status),
  CONSTRAINT chk_offering_capacity CHECK (capacity > 0),
  CONSTRAINT fk_offerings_course
    FOREIGN KEY (course_id) REFERENCES courses (course_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_offerings_term
    FOREIGN KEY (term_id) REFERENCES academic_terms (term_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_offerings_faculty
    FOREIGN KEY (faculty_user_id) REFERENCES employee_profiles (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS class_meetings (
  meeting_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  offering_id BIGINT UNSIGNED NOT NULL,
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(100) NULL,
  PRIMARY KEY (meeting_id),
  KEY ix_meetings_offering_day (offering_id, day_of_week),
  CONSTRAINT chk_class_meeting_time CHECK (end_time > start_time),
  CONSTRAINT fk_meetings_offering
    FOREIGN KEY (offering_id) REFERENCES course_offerings (offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_code VARCHAR(24) NOT NULL,
  student_user_id BIGINT UNSIGNED NOT NULL,
  offering_id BIGINT UNSIGNED NOT NULL,
  enrollment_status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  decision_note VARCHAR(500) NULL,
  PRIMARY KEY (enrollment_id),
  UNIQUE KEY uq_enrollments_request_code (request_code),
  UNIQUE KEY uq_enrollments_student_offering (student_user_id, offering_id),
  UNIQUE KEY uq_enrollment_id_offering (enrollment_id, offering_id),
  KEY ix_enrollments_status_requested (enrollment_status, requested_at),
  KEY ix_enrollments_offering_status (offering_id, enrollment_status),
  CONSTRAINT fk_enrollments_student
    FOREIGN KEY (student_user_id) REFERENCES student_profiles (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_offering
    FOREIGN KEY (offering_id) REFERENCES course_offerings (offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessments (
  assessment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  offering_id BIGINT UNSIGNED NOT NULL,
  assessment_name VARCHAR(100) NOT NULL,
  max_score DECIMAL(7,2) NOT NULL DEFAULT 100.00,
  weight_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  due_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assessment_id),
  UNIQUE KEY uq_assessment_offering_name (offering_id, assessment_name),
  UNIQUE KEY uq_assessment_id_offering (assessment_id, offering_id),
  CONSTRAINT chk_assessment_max_score CHECK (max_score > 0),
  CONSTRAINT chk_assessment_weight CHECK (weight_percent BETWEEN 0 AND 100),
  CONSTRAINT fk_assessments_offering
    FOREIGN KEY (offering_id) REFERENCES course_offerings (offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessment_scores (
  assessment_score_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assessment_id BIGINT UNSIGNED NOT NULL,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  offering_id BIGINT UNSIGNED NOT NULL,
  score DECIMAL(7,2) NULL,
  feedback VARCHAR(500) NULL,
  graded_by_user_id BIGINT UNSIGNED NULL,
  graded_at DATETIME NULL,
  PRIMARY KEY (assessment_score_id),
  UNIQUE KEY uq_score_assessment_enrollment (assessment_id, enrollment_id),
  KEY ix_scores_enrollment (enrollment_id),
  CONSTRAINT chk_assessment_score CHECK (score IS NULL OR score >= 0),
  CONSTRAINT fk_scores_assessment_offering
    FOREIGN KEY (assessment_id, offering_id)
    REFERENCES assessments (assessment_id, offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_scores_enrollment_offering
    FOREIGN KEY (enrollment_id, offering_id)
    REFERENCES enrollments (enrollment_id, offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_scores_grader
    FOREIGN KEY (graded_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS final_grades (
  enrollment_id BIGINT UNSIGNED NOT NULL,
  numeric_grade DECIMAL(5,2) NULL,
  letter_grade VARCHAR(5) NULL,
  grade_points DECIMAL(3,2) NULL,
  grade_status ENUM('draft', 'submitted', 'final') NOT NULL DEFAULT 'draft',
  entered_by_user_id BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (enrollment_id),
  CONSTRAINT chk_final_numeric_grade CHECK (
    numeric_grade IS NULL OR numeric_grade BETWEEN 0 AND 100
  ),
  CONSTRAINT chk_final_grade_points CHECK (
    grade_points IS NULL OR grade_points BETWEEN 0 AND 4
  ),
  CONSTRAINT fk_final_grades_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES enrollments (enrollment_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_final_grades_entered_by
    FOREIGN KEY (entered_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_sessions (
  attendance_session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  offering_id BIGINT UNSIGNED NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NULL,
  taken_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attendance_session_id),
  UNIQUE KEY uq_attendance_session_offering (attendance_session_id, offering_id),
  UNIQUE KEY uq_attendance_date_time (offering_id, session_date, start_time),
  KEY ix_attendance_sessions_date (session_date),
  CONSTRAINT fk_attendance_sessions_offering
    FOREIGN KEY (offering_id) REFERENCES course_offerings (offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_sessions_taker
    FOREIGN KEY (taken_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_records (
  attendance_record_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attendance_session_id BIGINT UNSIGNED NOT NULL,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  offering_id BIGINT UNSIGNED NOT NULL,
  attendance_status ENUM('present', 'late', 'absent', 'unmarked') NOT NULL DEFAULT 'unmarked',
  note VARCHAR(500) NULL,
  marked_at DATETIME NULL,
  PRIMARY KEY (attendance_record_id),
  UNIQUE KEY uq_attendance_session_enrollment (attendance_session_id, enrollment_id),
  KEY ix_attendance_records_enrollment (enrollment_id),
  CONSTRAINT fk_attendance_session_offering
    FOREIGN KEY (attendance_session_id, offering_id)
    REFERENCES attendance_sessions (attendance_session_id, offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_enrollment_offering
    FOREIGN KEY (enrollment_id, offering_id)
    REFERENCES enrollments (enrollment_id, offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  description VARCHAR(255) NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  CONSTRAINT fk_settings_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT INTO departments (department_code, department_name, college_name)
VALUES
  ('IS', 'Information Systems', 'College of Computing'),
  ('CS', 'Computer Science', 'College of Computing'),
  ('IT', 'Information Technology', 'College of Computing'),
  ('GE', 'General Education', 'College of Arts and Sciences')
ON DUPLICATE KEY UPDATE
  department_name = VALUES(department_name),
  college_name = VALUES(college_name);

INSERT INTO programs (program_id, program_code, program_name, department_id)
SELECT seed.program_id, seed.program_code, seed.program_name, departments.department_id
FROM (
  SELECT 'IS-01' AS program_id, 'BSIS' AS program_code, 'BS Information Systems' AS program_name, 'IS' AS department_code
  UNION ALL SELECT 'CS-02', 'BSCS', 'BS Computer Science', 'CS'
  UNION ALL SELECT 'IT-03', 'BSIT', 'BS Information Technology', 'IT'
) AS seed
JOIN departments ON departments.department_code = seed.department_code
ON DUPLICATE KEY UPDATE
  program_id = VALUES(program_id),
  program_name = VALUES(program_name),
  department_id = VALUES(department_id);

INSERT INTO academic_years (year_label, start_date, end_date, is_current)
VALUES ('2026-2027', '2026-08-01', '2027-06-30', TRUE)
ON DUPLICATE KEY UPDATE
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  is_current = VALUES(is_current);

UPDATE academic_years
SET is_current = FALSE
WHERE year_label <> '2026-2027' AND is_current = TRUE;

UPDATE academic_terms t
JOIN academic_years y ON y.academic_year_id = t.academic_year_id
SET t.term_status = 'completed'
WHERE y.year_label <> '2026-2027' AND t.term_status = 'active';

INSERT INTO academic_terms (
  academic_year_id, term_name, start_date, end_date,
  enrollment_start, enrollment_end, term_status
)
SELECT academic_year_id, '1st semester', '2026-08-01', '2026-12-20',
  '2026-07-01', '2026-08-15', 'active'
FROM academic_years
WHERE year_label = '2026-2027'
ON DUPLICATE KEY UPDATE
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  enrollment_start = VALUES(enrollment_start),
  enrollment_end = VALUES(enrollment_end),
  term_status = VALUES(term_status);

INSERT INTO academic_terms (
  academic_year_id, term_name, start_date, end_date,
  enrollment_start, enrollment_end, term_status
)
SELECT academic_year_id, '2nd semester', '2027-01-05', '2027-05-30',
  '2026-12-01', '2027-01-15', 'upcoming'
FROM academic_years
WHERE year_label = '2026-2027'
ON DUPLICATE KEY UPDATE
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  enrollment_start = VALUES(enrollment_start),
  enrollment_end = VALUES(enrollment_end),
  term_status = VALUES(term_status);

INSERT INTO courses (course_id, course_code, course_title, units, department_id)
SELECT seed.course_id, seed.course_code, seed.course_title, seed.units, departments.department_id
FROM (
  SELECT 'C-80' AS course_id, 'COSC 80' AS course_code, 'Operating Systems' AS course_title, 3 AS units, 'CS' AS department_code
  UNION ALL SELECT 'D-26', 'DCIT 26', 'Applications Development and Emerging Technologies', 3, 'IT'
  UNION ALL SELECT 'C-85', 'COSC 85', 'Networks and Communication', 3, 'CS'
  UNION ALL SELECT 'D-65', 'DCIT 65', 'Social and Professional Issues', 3, 'IT'
  UNION ALL SELECT 'C-75', 'COSC 75', 'Software Engineering II', 3, 'CS'
  UNION ALL SELECT 'C-101', 'COSC 101', 'CS Elective 1 (Computer Graphics and Visual Computing)', 3, 'CS'
  UNION ALL SELECT 'M-03', 'MATH 3', 'Linear Algebra', 3, 'GE'
  UNION ALL SELECT 'G-02', 'GNED 02', 'Ethics', 3, 'GE'
  UNION ALL SELECT 'P-01', 'PATHFIT 1', 'Physical Activities Toward Health and Fitness 1', 2, 'GE'
  UNION ALL SELECT 'G-11', 'GNED 11', 'Kontekstwalisadong Komunikasyon sa Filipino', 3, 'GE'
  UNION ALL SELECT 'C-50', 'COSC 50', 'Discrete Structure', 3, 'CS'
  UNION ALL SELECT 'D-21', 'DCIT 21', 'Introduction to Computing', 3, 'CS'
  UNION ALL SELECT 'D-22', 'DCIT 22', 'Computer Programming 1', 3, 'CS'
  UNION ALL SELECT 'G-05', 'GNED 05', 'Purposive Communication', 3, 'GE'
  UNION ALL SELECT 'CV-101', 'CvSU 101', 'Institutional Orientation', 1, 'GE'
  UNION ALL SELECT 'D-50', 'DCIT 50', 'Object Oriented Programming', 3, 'CS'
  UNION ALL SELECT 'C-60', 'COSC 60', 'Digital Logic Design', 3, 'CS'
  UNION ALL SELECT 'C-55', 'COSC 55', 'Discrete Structures II', 3, 'CS'
  UNION ALL SELECT 'D-24', 'DCIT 24', 'Information Management', 3, 'CS'
  UNION ALL SELECT 'G-04', 'GNED 04', 'Mga Babasahin Hinggil sa Kasaysayan ng Pilipinas', 3, 'GE'
  UNION ALL SELECT 'F-03', 'FITT 3', 'Physical Activities Toward Health and Fitness 1', 2, 'GE'
  UNION ALL SELECT 'M-01', 'MATH 1', 'Analytic Geometry', 3, 'GE'
  UNION ALL SELECT 'I-50', 'INSY 50', 'Fundamentals of Information System', 3, 'CS'
) AS seed
JOIN departments ON departments.department_code = seed.department_code
ON DUPLICATE KEY UPDATE
  course_id = VALUES(course_id),
  course_title = VALUES(course_title),
  units = VALUES(units),
  department_id = VALUES(department_id);

INSERT INTO program_courses (program_id, course_id, recommended_year)
SELECT programs.program_id, courses.course_id, seed.recommended_year
FROM (
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
  UNION ALL SELECT 'BSCS', 'GNED 02', 1
  UNION ALL SELECT 'BSCS', 'PATHFIT 1', 1
  UNION ALL SELECT 'BSCS', 'GNED 11', 1
  UNION ALL SELECT 'BSCS', 'COSC 50', 1
  UNION ALL SELECT 'BSCS', 'DCIT 21', 1
  UNION ALL SELECT 'BSCS', 'DCIT 22', 1
  UNION ALL SELECT 'BSCS', 'GNED 05', 1
  UNION ALL SELECT 'BSCS', 'CvSU 101', 1
  UNION ALL SELECT 'BSCS', 'DCIT 50', 2
  UNION ALL SELECT 'BSCS', 'COSC 60', 2
  UNION ALL SELECT 'BSCS', 'COSC 55', 2
  UNION ALL SELECT 'BSCS', 'DCIT 24', 2
  UNION ALL SELECT 'BSCS', 'GNED 04', 2
  UNION ALL SELECT 'BSCS', 'FITT 3', 2
  UNION ALL SELECT 'BSCS', 'MATH 1', 2
  UNION ALL SELECT 'BSCS', 'INSY 50', 2
) AS seed
JOIN programs ON programs.program_code = seed.program_code
JOIN courses ON courses.course_code = seed.course_code
ON DUPLICATE KEY UPDATE
  is_required = VALUES(is_required),
  recommended_year = VALUES(recommended_year);

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES
  ('institution_name', JSON_QUOTE('EduTrack University'), 'Name displayed throughout the application.'),
  ('email_notifications', JSON_EXTRACT('true', '$'), 'Whether account and system email notifications are enabled.'),
  ('two_factor_required_for_admins', JSON_EXTRACT('true', '$'), 'Whether administrators must use two-step verification.'),
  ('session_timeout_minutes', JSON_EXTRACT('30', '$'), 'User session timeout in minutes.'),
  ('maintenance_mode', JSON_EXTRACT('false', '$'), 'Whether the application is in maintenance mode.')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

-- Human-readable roster view; enrollment records remain normalized across
-- students, courses, offerings, and enrollment decisions.
CREATE OR REPLACE VIEW enrolled_students_by_course AS
SELECT
  sp.student_number,
  u.full_name AS student_name,
  c.course_code,
  c.course_title,
  co.section_code,
  ay.year_label AS academic_year,
  t.term_name,
  'enrolled' AS enrollment_status,
  e.requested_at,
  e.reviewed_at
FROM enrollments e
JOIN student_profiles sp ON sp.user_id = e.student_user_id
JOIN users u ON u.user_id = sp.user_id
JOIN course_offerings co ON co.offering_id = e.offering_id
JOIN courses c ON c.course_id = co.course_id
JOIN academic_terms t ON t.term_id = co.term_id
JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
WHERE e.enrollment_status = 'approved'
  AND t.term_status = 'active';

-- Role-specific, table-like views over the normalized user and profile tables.
CREATE OR REPLACE SQL SECURITY INVOKER VIEW users_student_table AS
SELECT u.user_id, sp.student_number, u.full_name, u.email,
  p.program_id, p.program_code, p.program_name, sp.year_level,
  sp.student_status, u.account_status, u.created_at
FROM users u
LEFT JOIN student_profiles sp ON sp.user_id = u.user_id
LEFT JOIN programs p ON p.program_id = sp.program_id
WHERE u.role = 'student';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW users_faculty_table AS
SELECT u.user_id, ep.employee_number, u.full_name, u.email,
  d.department_code, d.department_name, ep.office, ep.hire_date,
  u.account_status, u.created_at
FROM users u
LEFT JOIN employee_profiles ep ON ep.user_id = u.user_id
LEFT JOIN departments d ON d.department_id = ep.department_id
WHERE u.role = 'faculty';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW users_registrar_table AS
SELECT u.user_id, ep.employee_number, u.full_name, u.email,
  d.department_code, d.department_name, ep.office, ep.hire_date,
  u.account_status, u.created_at
FROM users u
LEFT JOIN employee_profiles ep ON ep.user_id = u.user_id
LEFT JOIN departments d ON d.department_id = ep.department_id
WHERE u.role = 'registrar';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW users_admin_table AS
SELECT u.user_id, ep.employee_number, u.full_name, u.email,
  d.department_code, d.department_name, ep.office, ep.hire_date,
  u.account_status, u.created_at
FROM users u
LEFT JOIN employee_profiles ep ON ep.user_id = u.user_id
LEFT JOIN departments d ON d.department_id = ep.department_id
WHERE u.role = 'admin';
