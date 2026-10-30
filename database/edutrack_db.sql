-- ============================================================================
-- EduTrack database schema and seed data
-- Tables are defined before their dependents to preserve foreign-key order.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS edutrack_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE edutrack_db;

-- 1. Academic structure
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

-- 2. User accounts and profiles
CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  address VARCHAR(255) NULL,
  student_number VARCHAR(30) NULL,
  first_name VARCHAR(80) NULL,
  last_name VARCHAR(80) NULL,
  name_suffix VARCHAR(20) NULL,
  date_of_birth DATE NULL,
  program_id VARCHAR(10) NULL,
  year_level TINYINT UNSIGNED NULL,
  student_status ENUM('active', 'on_leave', 'graduated', 'withdrawn') NULL,
  employee_number VARCHAR(30) NULL,
  department_id BIGINT UNSIGNED NULL,
  office VARCHAR(160) NULL,
  hire_date DATE NULL,
  role ENUM('student', 'registrar', 'admin') NOT NULL,
  account_status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_student_number (student_number),
  UNIQUE KEY uq_users_employee_number (employee_number),
  KEY ix_users_role_status (role, account_status),
  KEY ix_users_program_status (program_id, student_status),
  KEY ix_users_department (department_id),
  CONSTRAINT chk_users_year_level CHECK (year_level IS NULL OR year_level BETWEEN 1 AND 4),
  CONSTRAINT fk_users_program
    FOREIGN KEY (program_id) REFERENCES programs (program_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments (department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_registration_requests (
  request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_number VARCHAR(30) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  name_suffix VARCHAR(20) NULL,
  date_of_birth DATE NOT NULL,
  program_id VARCHAR(10) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(40) NULL,
  password_hash VARCHAR(255) NULL,
  request_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pending_student_number VARCHAR(30) GENERATED ALWAYS AS (IF(request_status = 'pending', student_number, NULL)) STORED,
  pending_email VARCHAR(254) GENERATED ALWAYS AS (IF(request_status = 'pending', email, NULL)) STORED,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_registration_pending_student_number (pending_student_number),
  UNIQUE KEY uq_registration_pending_email (pending_email),
  KEY ix_registration_status_created (request_status, created_at),
  KEY ix_registration_program_year (program_id, year_level),
  CONSTRAINT chk_registration_year_level CHECK (year_level BETWEEN 1 AND 4),
  CONSTRAINT fk_registration_program
    FOREIGN KEY (program_id) REFERENCES programs (program_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_registration_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_registration_created_user
    FOREIGN KEY (created_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_registration_request_documents (
  document_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_filename VARCHAR(40) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id),
  UNIQUE KEY uq_registration_request_document_slot (request_id, slot_number),
  UNIQUE KEY uq_registration_request_document_storage (storage_filename),
  CONSTRAINT chk_registration_request_document_slot CHECK (slot_number BETWEEN 1 AND 3),
  CONSTRAINT fk_registration_request_documents_request
    FOREIGN KEY (request_id) REFERENCES student_registration_requests (request_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_document_registration_requests (
  request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_user_id BIGINT UNSIGNED NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  request_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  decision_note VARCHAR(500) NULL,
  PRIMARY KEY (request_id),
  KEY ix_student_doc_requests_status_date (request_status, submitted_at),
  KEY ix_student_doc_requests_student_term (student_user_id, term_id),
  CONSTRAINT fk_student_doc_requests_student FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_doc_requests_term FOREIGN KEY (term_id) REFERENCES academic_terms (term_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_doc_requests_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_registration_documents (
  document_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  slot_number TINYINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_filename CHAR(36) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id),
  UNIQUE KEY uq_registration_document_slot (request_id, slot_number),
  UNIQUE KEY uq_registration_document_storage (storage_filename),
  CONSTRAINT chk_registration_document_slot CHECK (slot_number BETWEEN 1 AND 3),
  CONSTRAINT fk_registration_documents_request FOREIGN KEY (request_id) REFERENCES student_document_registration_requests (request_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campus_student_registry (
  student_number VARCHAR(30) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  student_email VARCHAR(254) NOT NULL,
  name_suffix VARCHAR(20) NULL,
  date_of_birth DATE NOT NULL,
  program_id VARCHAR(10) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  section_code CHAR(1) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_number),
  UNIQUE KEY uq_campus_registry_email (student_email),
  KEY ix_campus_registry_program_year (program_id, year_level),
  CONSTRAINT chk_campus_registry_year CHECK (year_level BETWEEN 1 AND 4),
  CONSTRAINT fk_campus_registry_program FOREIGN KEY (program_id) REFERENCES programs (program_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. Courses, curriculum, and sections
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
  recommended_semester TINYINT UNSIGNED NULL,
  PRIMARY KEY (program_id, course_id),
  CONSTRAINT chk_program_course_year CHECK (
    recommended_year IS NULL OR recommended_year BETWEEN 1 AND 4
  ),
  CONSTRAINT chk_program_course_semester CHECK (
    recommended_semester IS NULL OR recommended_semester BETWEEN 1 AND 2
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
  course_number VARCHAR(20) NULL,
  course_id VARCHAR(10) NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  section_code VARCHAR(30) NOT NULL,
  instructor_name VARCHAR(160) NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 40,
  offering_status ENUM('open', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (offering_id),
  UNIQUE KEY uq_course_offerings_course_number (course_number),
  UNIQUE KEY uq_offering_term_section (course_id, term_id, section_code),
  UNIQUE KEY uq_offering_id_term (offering_id, term_id),
  KEY ix_offerings_term_status (term_id, offering_status),
  CONSTRAINT chk_offering_capacity CHECK (capacity > 0),
  CONSTRAINT fk_offerings_course
    FOREIGN KEY (course_id) REFERENCES courses (course_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_offerings_term
    FOREIGN KEY (term_id) REFERENCES academic_terms (term_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS class_meetings (
  meeting_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  offering_id BIGINT UNSIGNED NOT NULL,
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') NOT NULL,
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

CREATE TABLE IF NOT EXISTS student_section_assignments (
  student_user_id BIGINT UNSIGNED NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  section_code CHAR(1) NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_user_id, term_id),
  KEY ix_student_section_term (term_id, section_code),
  CONSTRAINT chk_student_section_code CHECK (section_code IN ('A', 'B', 'C')),
  CONSTRAINT fk_student_section_student FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_section_term FOREIGN KEY (term_id) REFERENCES academic_terms (term_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_section_assigner FOREIGN KEY (assigned_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Enrollment
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
    FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_offering
    FOREIGN KEY (offering_id) REFERENCES course_offerings (offering_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. Application settings
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

-- 6. Seed data: departments and academic programs
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

-- Seed data: academic calendar
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

-- Seed data: course catalog, program curricula, and course offerings
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
  UNION ALL SELECT 'G-01', 'GNED 01', 'Mathematics in the Modern World', 3, 'GE'
  UNION ALL SELECT 'G-03', 'GNED 03', 'Understanding the Self', 3, 'GE'
  UNION ALL SELECT 'G-06', 'GNED 06', 'Science, Technology, and Society', 3, 'GE'
  UNION ALL SELECT 'I-51', 'INSY 51', 'Business Process and Information Systems', 3, 'IS'
  UNION ALL SELECT 'D-20', 'DCIT 20', 'Fundamentals of Programming', 3, 'IT'
  UNION ALL SELECT 'G-07', 'GNED 07', 'Art Appreciation', 3, 'GE'
  UNION ALL SELECT 'G-08', 'GNED 08', 'The Contemporary World', 3, 'GE'
  UNION ALL SELECT 'P-02', 'PATHFIT 2', 'Physical Activities Toward Health and Fitness 2', 2, 'GE'
  UNION ALL SELECT 'D-23', 'DCIT 23', 'Data Structures and Algorithms', 3, 'IT'
  UNION ALL SELECT 'I-52', 'INSY 52', 'Systems Analysis and Design', 3, 'IS'
  UNION ALL SELECT 'I-53', 'INSY 53', 'Database Management Systems', 3, 'IS'
  UNION ALL SELECT 'C-21', 'COSC 21', 'Object-Oriented Programming', 3, 'CS'
  UNION ALL SELECT 'C-22', 'COSC 22', 'Data Structures and Algorithms', 3, 'CS'
) AS seed
JOIN departments ON departments.department_code = seed.department_code
ON DUPLICATE KEY UPDATE
  course_id = VALUES(course_id),
  course_title = VALUES(course_title),
  units = VALUES(units),
  department_id = VALUES(department_id);

INSERT INTO program_courses (program_id, course_id, recommended_year, recommended_semester)
SELECT programs.program_id, courses.course_id, seed.recommended_year,
  CASE
    WHEN (seed.program_code IN ('BSIT', 'BSIS') AND seed.course_code IN ('GNED 02', 'GNED 04', 'GNED 07', 'GNED 08', 'GNED 11', 'PATHFIT 2', 'DCIT 22', 'DCIT 23', 'INSY 52', 'INSY 53'))
      OR (seed.program_code = 'BSCS' AND seed.course_code IN ('GNED 01', 'GNED 03', 'GNED 04', 'GNED 06', 'GNED 07', 'PATHFIT 2', 'COSC 21', 'COSC 22')) THEN 2
    WHEN seed.recommended_year = 1 THEN 1
    ELSE NULL
  END
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
  UNION ALL SELECT 'BSIT', 'GNED 01', 1
  UNION ALL SELECT 'BSIT', 'GNED 03', 1
  UNION ALL SELECT 'BSIT', 'GNED 05', 1
  UNION ALL SELECT 'BSIT', 'GNED 06', 1
  UNION ALL SELECT 'BSIT', 'PATHFIT 1', 1
  UNION ALL SELECT 'BSIT', 'CvSU 101', 1
  UNION ALL SELECT 'BSIT', 'DCIT 20', 1
  UNION ALL SELECT 'BSIT', 'DCIT 21', 1
  UNION ALL SELECT 'BSIS', 'GNED 01', 1
  UNION ALL SELECT 'BSIS', 'GNED 03', 1
  UNION ALL SELECT 'BSIS', 'GNED 05', 1
  UNION ALL SELECT 'BSIS', 'GNED 06', 1
  UNION ALL SELECT 'BSIS', 'PATHFIT 1', 1
  UNION ALL SELECT 'BSIS', 'CvSU 101', 1
  UNION ALL SELECT 'BSIS', 'INSY 50', 1
  UNION ALL SELECT 'BSIS', 'INSY 51', 1
  UNION ALL SELECT 'BSIT', 'GNED 02', 1
  UNION ALL SELECT 'BSIT', 'GNED 04', 1
  UNION ALL SELECT 'BSIT', 'GNED 07', 1
  UNION ALL SELECT 'BSIT', 'GNED 08', 1
  UNION ALL SELECT 'BSIT', 'GNED 11', 1
  UNION ALL SELECT 'BSIT', 'PATHFIT 2', 1
  UNION ALL SELECT 'BSIT', 'DCIT 22', 1
  UNION ALL SELECT 'BSIT', 'DCIT 23', 1
  UNION ALL SELECT 'BSIS', 'GNED 02', 1
  UNION ALL SELECT 'BSIS', 'GNED 04', 1
  UNION ALL SELECT 'BSIS', 'GNED 07', 1
  UNION ALL SELECT 'BSIS', 'GNED 08', 1
  UNION ALL SELECT 'BSIS', 'GNED 11', 1
  UNION ALL SELECT 'BSIS', 'PATHFIT 2', 1
  UNION ALL SELECT 'BSIS', 'INSY 52', 1
  UNION ALL SELECT 'BSIS', 'INSY 53', 1
  UNION ALL SELECT 'BSCS', 'GNED 01', 1
  UNION ALL SELECT 'BSCS', 'GNED 03', 1
  UNION ALL SELECT 'BSCS', 'GNED 04', 1
  UNION ALL SELECT 'BSCS', 'GNED 06', 1
  UNION ALL SELECT 'BSCS', 'GNED 07', 1
  UNION ALL SELECT 'BSCS', 'PATHFIT 2', 1
  UNION ALL SELECT 'BSCS', 'COSC 21', 1
  UNION ALL SELECT 'BSCS', 'COSC 22', 1
) AS seed
JOIN programs ON programs.program_code = seed.program_code
JOIN courses ON courses.course_code = seed.course_code
ON DUPLICATE KEY UPDATE
  is_required = VALUES(is_required),
  recommended_year = VALUES(recommended_year),
  recommended_semester = VALUES(recommended_semester);

INSERT INTO course_offerings (course_id, term_id, section_code, capacity, offering_status)
SELECT pc.course_id, t.term_id,
  CONCAT(programs.program_code, '-', pc.recommended_year, '-', sections.section_letter),
  40, 'open'
FROM program_courses pc
JOIN programs ON programs.program_id = pc.program_id AND programs.is_active = 1
JOIN courses ON courses.course_id = pc.course_id AND courses.course_status = 'active'
JOIN academic_terms t ON t.term_status IN ('active', 'upcoming')
  AND t.term_name = CASE pc.recommended_semester WHEN 1 THEN '1st semester' WHEN 2 THEN '2nd semester' END
CROSS JOIN (SELECT 'A' AS section_letter UNION ALL SELECT 'B' UNION ALL SELECT 'C') sections
WHERE pc.is_required = 1 AND pc.recommended_semester IS NOT NULL
ON DUPLICATE KEY UPDATE offering_id = LAST_INSERT_ID(offering_id);

UPDATE course_offerings SET course_number = NULL;

UPDATE course_offerings co
JOIN (
  SELECT co.offering_id,
         CONCAT(
           LEFT(ay.year_label, 4),
           CASE t.term_name WHEN '1st semester' THEN '1' WHEN '2nd semester' THEN '2' ELSE '0' END,
           LPAD(ROW_NUMBER() OVER (
             PARTITION BY t.term_id
             ORDER BY CASE WHEN courses.course_code = 'COSC 50' THEN 0 ELSE 1 END,
                      courses.course_code, co.section_code
           ), 4, '0')
         ) AS course_number
  FROM course_offerings co
  JOIN courses ON courses.course_id = co.course_id
  JOIN academic_terms t ON t.term_id = co.term_id
  JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
) numbered ON numbered.offering_id = co.offering_id
SET co.course_number = numbered.course_number;


-- Seed data: application defaults
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES
  ('institution_name', JSON_QUOTE('EduTrack University'), 'Name displayed throughout the application.'),
  ('email_notifications', JSON_EXTRACT('true', '$'), 'Whether account and system email notifications are enabled.'),
  ('two_factor_required_for_admins', JSON_EXTRACT('true', '$'), 'Whether administrators must use two-step verification.'),
  ('session_timeout_minutes', JSON_EXTRACT('30', '$'), 'User session timeout in minutes.'),
  ('maintenance_mode', JSON_EXTRACT('false', '$'), 'Whether the application is in maintenance mode.')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
