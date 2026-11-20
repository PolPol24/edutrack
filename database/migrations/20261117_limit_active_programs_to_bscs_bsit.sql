UPDATE programs
SET is_active = CASE WHEN program_code IN ('BSCS', 'BSIT') THEN 1 ELSE 0 END;
