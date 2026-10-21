-- Add numeric course identifiers, three cohort sections, and program sample rosters.
ALTER TABLE campus_student_registry ADD COLUMN section_code CHAR(1) NULL AFTER year_level;
ALTER TABLE course_offerings ADD COLUMN course_number VARCHAR(20) NULL AFTER offering_id;
ALTER TABLE course_offerings ADD UNIQUE KEY uq_course_offerings_course_number (course_number);

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

UPDATE course_offerings co
JOIN academic_terms t ON t.term_id = co.term_id
JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
SET co.course_number = CONCAT(LEFT(ay.year_label, 4), CASE t.term_name WHEN '1st semester' THEN '1' WHEN '2nd semester' THEN '2' ELSE '0' END, LPAD(co.offering_id, 4, '0'))
WHERE co.course_number IS NULL;

-- The original 50 campus records are the BSIT sample cohort.
UPDATE campus_student_registry
SET program_id = 'IT-03'
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

-- Spread each program cohort evenly across sections A, B, and C.
UPDATE campus_student_registry r
JOIN (
  SELECT student_number,
    ELT(MOD(ROW_NUMBER() OVER (PARTITION BY program_id ORDER BY student_number) - 1, 3) + 1, 'A', 'B', 'C') AS section_code
  FROM campus_student_registry
) distribution ON distribution.student_number = r.student_number
SET r.section_code = distribution.section_code;

-- Keep existing student profiles aligned with the campus roster's assigned program and year.
UPDATE student_profiles sp
JOIN campus_student_registry r ON r.student_number = sp.student_number
SET sp.program_id = r.program_id, sp.year_level = r.year_level;
