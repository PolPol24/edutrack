ALTER TABLE users
  ADD COLUMN personal_email VARCHAR(254) NULL AFTER email,
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER account_status;

CREATE TABLE IF NOT EXISTS student_number_sequences (
  school_year CHAR(4) NOT NULL,
  last_number INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (school_year)
) ENGINE=InnoDB;