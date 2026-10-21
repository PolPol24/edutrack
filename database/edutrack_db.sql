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
  first_name VARCHAR(80) NULL,
  last_name VARCHAR(80) NULL,
  name_suffix VARCHAR(20) NULL,
  date_of_birth DATE NULL,
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

CREATE TABLE IF NOT EXISTS student_registration_requests (
  request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_number VARCHAR(30) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  name_suffix VARCHAR(20) NULL,
  date_of_birth DATE NOT NULL,
  email VARCHAR(254) NOT NULL,
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
  CONSTRAINT fk_registration_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_registration_created_user
    FOREIGN KEY (created_user_id) REFERENCES users (user_id)
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
  faculty_user_id BIGINT UNSIGNED NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 40,
  offering_status ENUM('open', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (offering_id),
  UNIQUE KEY uq_course_offerings_course_number (course_number),
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

CREATE TABLE IF NOT EXISTS student_section_assignments (
  student_user_id BIGINT UNSIGNED NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  section_code CHAR(1) NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_user_id, term_id),
  KEY ix_student_section_term (term_id, section_code),
  CONSTRAINT chk_student_section_code CHECK (section_code IN ('A', 'B', 'C')),
  CONSTRAINT fk_student_section_student FOREIGN KEY (student_user_id) REFERENCES student_profiles (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_section_term FOREIGN KEY (term_id) REFERENCES academic_terms (term_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_section_assigner FOREIGN KEY (assigned_by_user_id) REFERENCES users (user_id)
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

INSERT INTO campus_student_registry (student_number, first_name, last_name, student_email, name_suffix, date_of_birth, program_id, year_level)
VALUES
  ('202600001', 'Ariana', 'Santos', 'ariana.santos@cvsu.edu.ph', NULL, '2001-01-01', 'CS-02', 1),
  ('202600002', 'Miguel', 'Reyes', 'miguel.reyes@cvsu.edu.ph', NULL, '2002-02-04', 'IS-01', 2),
  ('202600003', 'Sofia', 'Cruz', 'sofia.cruz@cvsu.edu.ph', NULL, '2003-03-07', 'IT-03', 3),
  ('202600004', 'Liam', 'Garcia', 'liam.garcia@cvsu.edu.ph', NULL, '2004-04-10', 'CS-02', 4),
  ('202600005', 'Isabella', 'Mendoza', 'isabella.mendoza@cvsu.edu.ph', NULL, '2005-05-13', 'IS-01', 1),
  ('202600006', 'Noah', 'Flores', 'noah.flores@cvsu.edu.ph', NULL, '2001-06-16', 'IT-03', 2),
  ('202600007', 'Mia', 'Ramos', 'mia.ramos@cvsu.edu.ph', NULL, '2002-07-19', 'CS-02', 3),
  ('202600008', 'Ethan', 'Castillo', 'ethan.castillo@cvsu.edu.ph', NULL, '2003-08-22', 'IS-01', 4),
  ('202600009', 'Amara', 'Dela', 'amara.dela@cvsu.edu.ph', NULL, '2004-09-25', 'IT-03', 1),
  ('202600010', 'Lucas', 'Bautista', 'lucas.bautista@cvsu.edu.ph', NULL, '2005-10-01', 'CS-02', 2),
  ('202600011', 'Zoe', 'Navarro', 'zoe.navarro@cvsu.edu.ph', NULL, '2001-11-04', 'IS-01', 3),
  ('202600012', 'Gabriel', 'Torres', 'gabriel.torres@cvsu.edu.ph', NULL, '2002-12-07', 'IT-03', 4),
  ('202600013', 'Chloe', 'Villanueva', 'chloe.villanueva@cvsu.edu.ph', NULL, '2003-01-10', 'CS-02', 1),
  ('202600014', 'Daniel', 'Aquino', 'daniel.aquino@cvsu.edu.ph', NULL, '2004-02-13', 'IS-01', 2),
  ('202600015', 'Ella', 'Fernandez', 'ella.fernandez@cvsu.edu.ph', NULL, '2005-03-16', 'IT-03', 3),
  ('202600016', 'Nathaniel', 'Morales', 'nathaniel.morales@cvsu.edu.ph', NULL, '2001-04-19', 'CS-02', 4),
  ('202600017', 'Leah', 'Santiago', 'leah.santiago@cvsu.edu.ph', NULL, '2002-05-22', 'IS-01', 1),
  ('202600018', 'Jacob', 'Domingo', 'jacob.domingo@cvsu.edu.ph', NULL, '2003-06-25', 'IT-03', 2),
  ('202600019', 'Isla', 'Herrera', 'isla.herrera@cvsu.edu.ph', NULL, '2004-07-01', 'CS-02', 3),
  ('202600020', 'Caleb', 'Gonzales', 'caleb.gonzales@cvsu.edu.ph', NULL, '2005-08-04', 'IS-01', 4),
  ('202600021', 'Maya', 'Rivera', 'maya.rivera@cvsu.edu.ph', NULL, '2001-09-07', 'IT-03', 1),
  ('202600022', 'Adrian', 'Lim', 'adrian.lim@cvsu.edu.ph', NULL, '2002-10-10', 'CS-02', 2),
  ('202600023', 'Nina', 'Valdez', 'nina.valdez@cvsu.edu.ph', NULL, '2003-11-13', 'IS-01', 3),
  ('202600024', 'Samuel', 'Mercado', 'samuel.mercado@cvsu.edu.ph', NULL, '2004-12-16', 'IT-03', 4),
  ('202600025', 'Claire', 'Pineda', 'claire.pineda@cvsu.edu.ph', NULL, '2005-01-19', 'CS-02', 1),
  ('202600026', 'Marco', 'Salazar', 'marco.salazar@cvsu.edu.ph', NULL, '2001-02-22', 'IS-01', 2),
  ('202600027', 'Jasmine', 'Aguilar', 'jasmine.aguilar@cvsu.edu.ph', NULL, '2002-03-25', 'IT-03', 3),
  ('202600028', 'Rafael', 'Soriano', 'rafael.soriano@cvsu.edu.ph', NULL, '2003-04-01', 'CS-02', 4),
  ('202600029', 'Bianca', 'Manalo', 'bianca.manalo@cvsu.edu.ph', NULL, '2004-05-04', 'IS-01', 1),
  ('202600030', 'Paolo', 'Cabrera', 'paolo.cabrera@cvsu.edu.ph', NULL, '2005-06-07', 'IT-03', 2),
  ('202600031', 'Talia', 'Espiritu', 'talia.espiritu@cvsu.edu.ph', NULL, '2001-07-10', 'CS-02', 3),
  ('202600032', 'Enzo', 'Pascual', 'enzo.pascual@cvsu.edu.ph', NULL, '2002-08-13', 'IS-01', 4),
  ('202600033', 'Camille', 'Abad', 'camille.abad@cvsu.edu.ph', NULL, '2003-09-16', 'IT-03', 1),
  ('202600034', 'Andres', 'Velasco', 'andres.velasco@cvsu.edu.ph', NULL, '2004-10-19', 'CS-02', 2),
  ('202600035', 'Angela', 'David', 'angela.david@cvsu.edu.ph', NULL, '2005-11-22', 'IS-01', 3),
  ('202600036', 'Joaquin', 'Padilla', 'joaquin.padilla@cvsu.edu.ph', NULL, '2001-12-25', 'IT-03', 4),
  ('202600037', 'Kyla', 'Natividad', 'kyla.natividad@cvsu.edu.ph', NULL, '2002-01-01', 'CS-02', 1),
  ('202600038', 'Luis', 'Romero', 'luis.romero@cvsu.edu.ph', NULL, '2003-02-04', 'IS-01', 2),
  ('202600039', 'Patricia', 'Alonzo', 'patricia.alonzo@cvsu.edu.ph', NULL, '2004-03-07', 'IT-03', 3),
  ('202600040', 'Dylan', 'Mendoza', 'dylan.mendoza@cvsu.edu.ph', NULL, '2005-04-10', 'CS-02', 4),
  ('202600041', 'Erika', 'Ocampo', 'erika.ocampo@cvsu.edu.ph', NULL, '2001-05-13', 'IS-01', 1),
  ('202600042', 'Joshua', 'Tan', 'joshua.tan@cvsu.edu.ph', NULL, '2002-06-16', 'IT-03', 2),
  ('202600043', 'Hannah', 'Lorenzo', 'hannah.lorenzo@cvsu.edu.ph', NULL, '2003-07-19', 'CS-02', 3),
  ('202600044', 'Vincent', 'Chua', 'vincent.chua@cvsu.edu.ph', NULL, '2004-08-22', 'IS-01', 4),
  ('202600045', 'Rhea', 'Marquez', 'rhea.marquez@cvsu.edu.ph', NULL, '2005-09-25', 'IT-03', 1),
  ('202600046', 'Francis', 'Javier', 'francis.javier@cvsu.edu.ph', NULL, '2001-10-01', 'CS-02', 2),
  ('202600047', 'Celine', 'Dizon', 'celine.dizon@cvsu.edu.ph', NULL, '2002-11-04', 'IS-01', 3),
  ('202600048', 'Matteo', 'Enriquez', 'matteo.enriquez@cvsu.edu.ph', NULL, '2003-12-07', 'IT-03', 4),
  ('202600049', 'Trisha', 'Robles', 'trisha.robles@cvsu.edu.ph', NULL, '2004-01-10', 'CS-02', 1),
  ('202600050', 'Kian', 'Sarmiento', 'kian.sarmiento@cvsu.edu.ph', NULL, '2005-02-13', 'IS-01', 2)
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), student_email = VALUES(student_email), name_suffix = VALUES(name_suffix), date_of_birth = VALUES(date_of_birth), program_id = VALUES(program_id), year_level = VALUES(year_level);

-- The first 50 sample students form BSIT; add 50 each for BSIS and BSCS.
UPDATE campus_student_registry SET program_id = 'IT-03'
WHERE student_number BETWEEN '202600001' AND '202600050';

INSERT INTO campus_student_registry
  (student_number, first_name, last_name, student_email, name_suffix, date_of_birth, program_id, year_level, section_code)
VALUES
  ('202610051', 'Althea', 'Alvarez', 'althea.alvarez@cvsu.edu.ph', NULL, '2002-01-01', 'IS-01', 1, 'A'),
  ('202610052', 'Althea', 'Bautista', 'althea.bautista@cvsu.edu.ph', NULL, '2003-08-06', 'IS-01', 1, 'B'),
  ('202610053', 'Althea', 'Cordero', 'althea.cordero@cvsu.edu.ph', NULL, '2004-03-11', 'IS-01', 1, 'C'),
  ('202610054', 'Althea', 'Dumlao', 'althea.dumlao@cvsu.edu.ph', NULL, '2005-10-16', 'IS-01', 1, 'A'),
  ('202610055', 'Althea', 'Estrella', 'althea.estrella@cvsu.edu.ph', NULL, '2002-05-21', 'IS-01', 1, 'B'),
  ('202610056', 'Bryan', 'Alvarez', 'bryan.alvarez@cvsu.edu.ph', NULL, '2003-12-26', 'IS-01', 1, 'C'),
  ('202610057', 'Bryan', 'Bautista', 'bryan.bautista@cvsu.edu.ph', NULL, '2004-07-04', 'IS-01', 1, 'A'),
  ('202610058', 'Bryan', 'Cordero', 'bryan.cordero@cvsu.edu.ph', NULL, '2005-02-09', 'IS-01', 1, 'B'),
  ('202610059', 'Bryan', 'Dumlao', 'bryan.dumlao@cvsu.edu.ph', NULL, '2002-09-14', 'IS-01', 1, 'C'),
  ('202610060', 'Bryan', 'Estrella', 'bryan.estrella@cvsu.edu.ph', NULL, '2003-04-19', 'IS-01', 1, 'A'),
  ('202610061', 'Carla', 'Alvarez', 'carla.alvarez@cvsu.edu.ph', NULL, '2004-11-24', 'IS-01', 1, 'B'),
  ('202610062', 'Carla', 'Bautista', 'carla.bautista@cvsu.edu.ph', NULL, '2005-06-02', 'IS-01', 1, 'C'),
  ('202610063', 'Carla', 'Cordero', 'carla.cordero@cvsu.edu.ph', NULL, '2002-01-07', 'IS-01', 1, 'A'),
  ('202610064', 'Carla', 'Dumlao', 'carla.dumlao@cvsu.edu.ph', NULL, '2003-08-12', 'IS-01', 1, 'B'),
  ('202610065', 'Carla', 'Estrella', 'carla.estrella@cvsu.edu.ph', NULL, '2004-03-17', 'IS-01', 1, 'C'),
  ('202610066', 'Derrick', 'Alvarez', 'derrick.alvarez@cvsu.edu.ph', NULL, '2005-10-22', 'IS-01', 1, 'A'),
  ('202610067', 'Derrick', 'Bautista', 'derrick.bautista@cvsu.edu.ph', NULL, '2002-05-27', 'IS-01', 1, 'B'),
  ('202610068', 'Derrick', 'Cordero', 'derrick.cordero@cvsu.edu.ph', NULL, '2003-12-05', 'IS-01', 1, 'C'),
  ('202610069', 'Derrick', 'Dumlao', 'derrick.dumlao@cvsu.edu.ph', NULL, '2004-07-10', 'IS-01', 1, 'A'),
  ('202610070', 'Derrick', 'Estrella', 'derrick.estrella@cvsu.edu.ph', NULL, '2005-02-15', 'IS-01', 1, 'B'),
  ('202610071', 'Elise', 'Alvarez', 'elise.alvarez@cvsu.edu.ph', NULL, '2002-09-20', 'IS-01', 1, 'C'),
  ('202610072', 'Elise', 'Bautista', 'elise.bautista@cvsu.edu.ph', NULL, '2003-04-25', 'IS-01', 1, 'A'),
  ('202610073', 'Elise', 'Cordero', 'elise.cordero@cvsu.edu.ph', NULL, '2004-11-03', 'IS-01', 1, 'B'),
  ('202610074', 'Elise', 'Dumlao', 'elise.dumlao@cvsu.edu.ph', NULL, '2005-06-08', 'IS-01', 1, 'C'),
  ('202610075', 'Elise', 'Estrella', 'elise.estrella@cvsu.edu.ph', NULL, '2002-01-13', 'IS-01', 1, 'A'),
  ('202610076', 'Fernando', 'Alvarez', 'fernando.alvarez@cvsu.edu.ph', NULL, '2003-08-18', 'IS-01', 1, 'B'),
  ('202610077', 'Fernando', 'Bautista', 'fernando.bautista@cvsu.edu.ph', NULL, '2004-03-23', 'IS-01', 1, 'C'),
  ('202610078', 'Fernando', 'Cordero', 'fernando.cordero@cvsu.edu.ph', NULL, '2005-10-01', 'IS-01', 1, 'A'),
  ('202610079', 'Fernando', 'Dumlao', 'fernando.dumlao@cvsu.edu.ph', NULL, '2002-05-06', 'IS-01', 1, 'B'),
  ('202610080', 'Fernando', 'Estrella', 'fernando.estrella@cvsu.edu.ph', NULL, '2003-12-11', 'IS-01', 1, 'C'),
  ('202610081', 'Grace', 'Alvarez', 'grace.alvarez@cvsu.edu.ph', NULL, '2004-07-16', 'IS-01', 1, 'A'),
  ('202610082', 'Grace', 'Bautista', 'grace.bautista@cvsu.edu.ph', NULL, '2005-02-21', 'IS-01', 1, 'B'),
  ('202610083', 'Grace', 'Cordero', 'grace.cordero@cvsu.edu.ph', NULL, '2002-09-26', 'IS-01', 1, 'C'),
  ('202610084', 'Grace', 'Dumlao', 'grace.dumlao@cvsu.edu.ph', NULL, '2003-04-04', 'IS-01', 1, 'A'),
  ('202610085', 'Grace', 'Estrella', 'grace.estrella@cvsu.edu.ph', NULL, '2004-11-09', 'IS-01', 1, 'B'),
  ('202610086', 'Harvey', 'Alvarez', 'harvey.alvarez@cvsu.edu.ph', NULL, '2005-06-14', 'IS-01', 1, 'C'),
  ('202610087', 'Harvey', 'Bautista', 'harvey.bautista@cvsu.edu.ph', NULL, '2002-01-19', 'IS-01', 1, 'A'),
  ('202610088', 'Harvey', 'Cordero', 'harvey.cordero@cvsu.edu.ph', NULL, '2003-08-24', 'IS-01', 1, 'B'),
  ('202610089', 'Harvey', 'Dumlao', 'harvey.dumlao@cvsu.edu.ph', NULL, '2004-03-02', 'IS-01', 1, 'C'),
  ('202610090', 'Harvey', 'Estrella', 'harvey.estrella@cvsu.edu.ph', NULL, '2005-10-07', 'IS-01', 1, 'A'),
  ('202610091', 'Irene', 'Alvarez', 'irene.alvarez@cvsu.edu.ph', NULL, '2002-05-12', 'IS-01', 1, 'B'),
  ('202610092', 'Irene', 'Bautista', 'irene.bautista@cvsu.edu.ph', NULL, '2003-12-17', 'IS-01', 1, 'C'),
  ('202610093', 'Irene', 'Cordero', 'irene.cordero@cvsu.edu.ph', NULL, '2004-07-22', 'IS-01', 1, 'A'),
  ('202610094', 'Irene', 'Dumlao', 'irene.dumlao@cvsu.edu.ph', NULL, '2005-02-27', 'IS-01', 1, 'B'),
  ('202610095', 'Irene', 'Estrella', 'irene.estrella@cvsu.edu.ph', NULL, '2002-09-05', 'IS-01', 1, 'C'),
  ('202610096', 'Julius', 'Alvarez', 'julius.alvarez@cvsu.edu.ph', NULL, '2003-04-10', 'IS-01', 1, 'A'),
  ('202610097', 'Julius', 'Bautista', 'julius.bautista@cvsu.edu.ph', NULL, '2004-11-15', 'IS-01', 1, 'B'),
  ('202610098', 'Julius', 'Cordero', 'julius.cordero@cvsu.edu.ph', NULL, '2005-06-20', 'IS-01', 1, 'C'),
  ('202610099', 'Julius', 'Dumlao', 'julius.dumlao@cvsu.edu.ph', NULL, '2002-01-25', 'IS-01', 1, 'A'),
  ('202610100', 'Julius', 'Estrella', 'julius.estrella@cvsu.edu.ph', NULL, '2003-08-03', 'IS-01', 1, 'B'),
  ('202610101', 'Katrina', 'Fuentes', 'katrina.fuentes@cvsu.edu.ph', NULL, '2002-01-01', 'CS-02', 1, 'A'),
  ('202610102', 'Katrina', 'Guevarra', 'katrina.guevarra@cvsu.edu.ph', NULL, '2003-08-06', 'CS-02', 1, 'B'),
  ('202610103', 'Katrina', 'Hernandez', 'katrina.hernandez@cvsu.edu.ph', NULL, '2004-03-11', 'CS-02', 1, 'C'),
  ('202610104', 'Katrina', 'Ilagan', 'katrina.ilagan@cvsu.edu.ph', NULL, '2005-10-16', 'CS-02', 1, 'A'),
  ('202610105', 'Katrina', 'Jacinto', 'katrina.jacinto@cvsu.edu.ph', NULL, '2002-05-21', 'CS-02', 1, 'B'),
  ('202610106', 'Lorenzo', 'Fuentes', 'lorenzo.fuentes@cvsu.edu.ph', NULL, '2003-12-26', 'CS-02', 1, 'C'),
  ('202610107', 'Lorenzo', 'Guevarra', 'lorenzo.guevarra@cvsu.edu.ph', NULL, '2004-07-04', 'CS-02', 1, 'A'),
  ('202610108', 'Lorenzo', 'Hernandez', 'lorenzo.hernandez@cvsu.edu.ph', NULL, '2005-02-09', 'CS-02', 1, 'B'),
  ('202610109', 'Lorenzo', 'Ilagan', 'lorenzo.ilagan@cvsu.edu.ph', NULL, '2002-09-14', 'CS-02', 1, 'C'),
  ('202610110', 'Lorenzo', 'Jacinto', 'lorenzo.jacinto@cvsu.edu.ph', NULL, '2003-04-19', 'CS-02', 1, 'A'),
  ('202610111', 'Mariel', 'Fuentes', 'mariel.fuentes@cvsu.edu.ph', NULL, '2004-11-24', 'CS-02', 1, 'B'),
  ('202610112', 'Mariel', 'Guevarra', 'mariel.guevarra@cvsu.edu.ph', NULL, '2005-06-02', 'CS-02', 1, 'C'),
  ('202610113', 'Mariel', 'Hernandez', 'mariel.hernandez@cvsu.edu.ph', NULL, '2002-01-07', 'CS-02', 1, 'A'),
  ('202610114', 'Mariel', 'Ilagan', 'mariel.ilagan@cvsu.edu.ph', NULL, '2003-08-12', 'CS-02', 1, 'B'),
  ('202610115', 'Mariel', 'Jacinto', 'mariel.jacinto@cvsu.edu.ph', NULL, '2004-03-17', 'CS-02', 1, 'C'),
  ('202610116', 'Nicolas', 'Fuentes', 'nicolas.fuentes@cvsu.edu.ph', NULL, '2005-10-22', 'CS-02', 1, 'A'),
  ('202610117', 'Nicolas', 'Guevarra', 'nicolas.guevarra@cvsu.edu.ph', NULL, '2002-05-27', 'CS-02', 1, 'B'),
  ('202610118', 'Nicolas', 'Hernandez', 'nicolas.hernandez@cvsu.edu.ph', NULL, '2003-12-05', 'CS-02', 1, 'C'),
  ('202610119', 'Nicolas', 'Ilagan', 'nicolas.ilagan@cvsu.edu.ph', NULL, '2004-07-10', 'CS-02', 1, 'A'),
  ('202610120', 'Nicolas', 'Jacinto', 'nicolas.jacinto@cvsu.edu.ph', NULL, '2005-02-15', 'CS-02', 1, 'B'),
  ('202610121', 'Olivia', 'Fuentes', 'olivia.fuentes@cvsu.edu.ph', NULL, '2002-09-20', 'CS-02', 1, 'C'),
  ('202610122', 'Olivia', 'Guevarra', 'olivia.guevarra@cvsu.edu.ph', NULL, '2003-04-25', 'CS-02', 1, 'A'),
  ('202610123', 'Olivia', 'Hernandez', 'olivia.hernandez@cvsu.edu.ph', NULL, '2004-11-03', 'CS-02', 1, 'B'),
  ('202610124', 'Olivia', 'Ilagan', 'olivia.ilagan@cvsu.edu.ph', NULL, '2005-06-08', 'CS-02', 1, 'C'),
  ('202610125', 'Olivia', 'Jacinto', 'olivia.jacinto@cvsu.edu.ph', NULL, '2002-01-13', 'CS-02', 1, 'A'),
  ('202610126', 'Patrick', 'Fuentes', 'patrick.fuentes@cvsu.edu.ph', NULL, '2003-08-18', 'CS-02', 1, 'B'),
  ('202610127', 'Patrick', 'Guevarra', 'patrick.guevarra@cvsu.edu.ph', NULL, '2004-03-23', 'CS-02', 1, 'C'),
  ('202610128', 'Patrick', 'Hernandez', 'patrick.hernandez@cvsu.edu.ph', NULL, '2005-10-01', 'CS-02', 1, 'A'),
  ('202610129', 'Patrick', 'Ilagan', 'patrick.ilagan@cvsu.edu.ph', NULL, '2002-05-06', 'CS-02', 1, 'B'),
  ('202610130', 'Patrick', 'Jacinto', 'patrick.jacinto@cvsu.edu.ph', NULL, '2003-12-11', 'CS-02', 1, 'C'),
  ('202610131', 'Queenie', 'Fuentes', 'queenie.fuentes@cvsu.edu.ph', NULL, '2004-07-16', 'CS-02', 1, 'A'),
  ('202610132', 'Queenie', 'Guevarra', 'queenie.guevarra@cvsu.edu.ph', NULL, '2005-02-21', 'CS-02', 1, 'B'),
  ('202610133', 'Queenie', 'Hernandez', 'queenie.hernandez@cvsu.edu.ph', NULL, '2002-09-26', 'CS-02', 1, 'C'),
  ('202610134', 'Queenie', 'Ilagan', 'queenie.ilagan@cvsu.edu.ph', NULL, '2003-04-04', 'CS-02', 1, 'A'),
  ('202610135', 'Queenie', 'Jacinto', 'queenie.jacinto@cvsu.edu.ph', NULL, '2004-11-09', 'CS-02', 1, 'B'),
  ('202610136', 'Ramon', 'Fuentes', 'ramon.fuentes@cvsu.edu.ph', NULL, '2005-06-14', 'CS-02', 1, 'C'),
  ('202610137', 'Ramon', 'Guevarra', 'ramon.guevarra@cvsu.edu.ph', NULL, '2002-01-19', 'CS-02', 1, 'A'),
  ('202610138', 'Ramon', 'Hernandez', 'ramon.hernandez@cvsu.edu.ph', NULL, '2003-08-24', 'CS-02', 1, 'B'),
  ('202610139', 'Ramon', 'Ilagan', 'ramon.ilagan@cvsu.edu.ph', NULL, '2004-03-02', 'CS-02', 1, 'C'),
  ('202610140', 'Ramon', 'Jacinto', 'ramon.jacinto@cvsu.edu.ph', NULL, '2005-10-07', 'CS-02', 1, 'A'),
  ('202610141', 'Shaira', 'Fuentes', 'shaira.fuentes@cvsu.edu.ph', NULL, '2002-05-12', 'CS-02', 1, 'B'),
  ('202610142', 'Shaira', 'Guevarra', 'shaira.guevarra@cvsu.edu.ph', NULL, '2003-12-17', 'CS-02', 1, 'C'),
  ('202610143', 'Shaira', 'Hernandez', 'shaira.hernandez@cvsu.edu.ph', NULL, '2004-07-22', 'CS-02', 1, 'A'),
  ('202610144', 'Shaira', 'Ilagan', 'shaira.ilagan@cvsu.edu.ph', NULL, '2005-02-27', 'CS-02', 1, 'B'),
  ('202610145', 'Shaira', 'Jacinto', 'shaira.jacinto@cvsu.edu.ph', NULL, '2002-09-05', 'CS-02', 1, 'C'),
  ('202610146', 'Tristan', 'Fuentes', 'tristan.fuentes@cvsu.edu.ph', NULL, '2003-04-10', 'CS-02', 1, 'A'),
  ('202610147', 'Tristan', 'Guevarra', 'tristan.guevarra@cvsu.edu.ph', NULL, '2004-11-15', 'CS-02', 1, 'B'),
  ('202610148', 'Tristan', 'Hernandez', 'tristan.hernandez@cvsu.edu.ph', NULL, '2005-06-20', 'CS-02', 1, 'C'),
  ('202610149', 'Tristan', 'Ilagan', 'tristan.ilagan@cvsu.edu.ph', NULL, '2002-01-25', 'CS-02', 1, 'A'),
  ('202610150', 'Tristan', 'Jacinto', 'tristan.jacinto@cvsu.edu.ph', NULL, '2003-08-03', 'CS-02', 1, 'B')
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), student_email = VALUES(student_email), name_suffix = VALUES(name_suffix), date_of_birth = VALUES(date_of_birth), program_id = VALUES(program_id), year_level = VALUES(year_level), section_code = VALUES(section_code);

UPDATE campus_student_registry r
JOIN (
  SELECT student_number,
    ELT(MOD(ROW_NUMBER() OVER (PARTITION BY program_id ORDER BY student_number) - 1, 3) + 1, 'A', 'B', 'C') AS section_code
  FROM campus_student_registry
) distribution ON distribution.student_number = r.student_number
SET r.section_code = distribution.section_code;

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
