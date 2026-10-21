<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/config.php';

try {
    $pdo = database();
    $pdo->beginTransaction();

    // This local demo reset intentionally removes old sample activity and rebuilds
    // only the explicitly requested accounts, catalog, sections, and enrollments.
    foreach ([
        'DELETE FROM attendance_records',
        'DELETE FROM attendance_sessions',
        'DELETE FROM assessment_scores',
        'DELETE FROM final_grades',
        'DELETE FROM assessments',
        'DELETE FROM class_meetings',
        'DELETE FROM enrollments',
        'UPDATE system_settings SET updated_by_user_id = NULL',
        'DELETE FROM course_offerings',
        'DELETE FROM program_courses',
    ] as $sql) {
        $pdo->exec($sql);
    }

    $accounts = [
        ['Alyssa Cruz', 'student@edutrack.edu', 'student', 'BSIT', 1, 'BSIT-1A', '2026'],
        ['Zedrick Tolentino', 'rance@edutrack.edu', 'student', 'BSCS', 3, 'BSCS-3D', '2026'],
        ['Pol Samsung', 'pol.samsung@edutrack.edu', 'student', 'BSCS', 2, 'BSCS-2C', '2026'],
        ['Maria Elena Santos', 'faculty@edutrack.edu', 'faculty', null, null, null, null],
        ['Lord Toletole', 'lord.toletole@edutrack.edu', 'faculty', null, null, null, null],
        ['Ramon Villanueva', 'registrar@edutrack.edu', 'registrar', null, null, null, null],
        ['EduTrack Administrator', 'admin@edutrack.edu', 'admin', null, null, null, null],
    ];
    $allowedEmails = array_column($accounts, 1);
    $placeholders = implode(',', array_fill(0, count($allowedEmails), '?'));
    $removeOtherStudentProfiles = $pdo->prepare("DELETE sp FROM student_profiles sp JOIN users u ON u.user_id = sp.user_id WHERE u.email NOT IN ($placeholders)");
    $removeOtherStudentProfiles->execute($allowedEmails);
    $removeOtherEmployeeProfiles = $pdo->prepare("DELETE ep FROM employee_profiles ep JOIN users u ON u.user_id = ep.user_id WHERE u.email NOT IN ($placeholders)");
    $removeOtherEmployeeProfiles->execute($allowedEmails);
    $removeOthers = $pdo->prepare("DELETE FROM users WHERE email NOT IN ($placeholders)");
    $removeOthers->execute($allowedEmails);

    $upsertUser = $pdo->prepare(
        'INSERT INTO users (full_name, email, password_hash, role, account_status)
         VALUES (:full_name, :email, :password_hash, :role, \'active\')
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash),
           role = VALUES(role), account_status = \'active\''
    );
    $getUser = $pdo->prepare('SELECT user_id, created_at FROM users WHERE email = :email');
    $getProgram = $pdo->prepare('SELECT program_id FROM programs WHERE program_code = :program_code');
    $upsertStudent = $pdo->prepare(
        'INSERT INTO student_profiles (user_id, student_number, program_id, year_level)
         VALUES (:user_id, :student_number, :program_id, :year_level)
         ON DUPLICATE KEY UPDATE student_number = VALUES(student_number),
           program_id = VALUES(program_id), year_level = VALUES(year_level), student_status = \'active\''
    );
    $upsertEmployee = $pdo->prepare(
        'INSERT INTO employee_profiles (user_id, employee_number, department_id)
         VALUES (:user_id, :employee_number, :department_id)
         ON DUPLICATE KEY UPDATE employee_number = VALUES(employee_number), department_id = VALUES(department_id)'
    );
    $findDepartment = $pdo->prepare('SELECT department_id FROM departments WHERE department_code = :code');
    $passwordHash = password_hash('password', PASSWORD_DEFAULT);
    $accountIds = [];
    $usedNumbers = [];

    foreach ($accounts as [$name, $email, $role, $programCode, $yearLevel]) {
        $upsertUser->execute([
            'full_name' => $name,
            'email' => $email,
            'password_hash' => $passwordHash,
            'role' => $role,
        ]);
        $getUser->execute(['email' => $email]);
        $user = $getUser->fetch();
        $userId = (int)$user['user_id'];
        $accountIds[$email] = $userId;

        if ($role === 'student') {
            $getProgram->execute(['program_code' => $programCode]);
            $programId = (string)$getProgram->fetchColumn();
            if (!$programId) {
                throw new RuntimeException('Missing program: ' . $programCode);
            }
            $createdYear = (new DateTimeImmutable((string)$user['created_at']))->format('Y');
            do {
                $studentNumber = $createdYear . str_pad((string)random_int(0, 99999), 5, '0', STR_PAD_LEFT);
            } while (isset($usedNumbers[$studentNumber]));
            $usedNumbers[$studentNumber] = true;
            $upsertStudent->execute([
                'user_id' => $userId,
                'student_number' => $studentNumber,
                'program_id' => $programId,
                'year_level' => $yearLevel,
            ]);
        } else {
            $departmentCode = $role === 'faculty' ? ($email === 'faculty@edutrack.edu' ? 'IS' : 'CS') : null;
            $departmentId = null;
            if ($departmentCode !== null) {
                $findDepartment->execute(['code' => $departmentCode]);
                $departmentId = (int)$findDepartment->fetchColumn() ?: null;
            }
            $prefix = strtoupper(substr($role, 0, 3));
            $upsertEmployee->execute([
                'user_id' => $userId,
                'employee_number' => $prefix . '-' . str_pad((string)$userId, 6, '0', STR_PAD_LEFT),
                'department_id' => $departmentId,
            ]);
        }
    }

    $pdo->exec('DELETE FROM courses');
    $courses = [
        ['COSC 80', 'Operating Systems', 3, 'CS'],
        ['DCIT 26', 'Applications Development and Emerging Technologies', 3, 'IT'],
        ['COSC 85', 'Networks and Communication', 3, 'CS'],
        ['DCIT 65', 'Social and Professional Issues', 3, 'IT'],
        ['COSC 75', 'Software Engineering II', 3, 'CS'],
        ['COSC 101', 'CS Elective 1 (Computer Graphics and Visual Computing)', 3, 'CS'],
        ['MATH 3', 'Linear Algebra', 3, 'GE'],
    ];
    $insertCourse = $pdo->prepare(
        'INSERT INTO courses (course_id, course_code, course_title, units, department_id)
         SELECT :id, :code, :title, :units, department_id FROM departments WHERE department_code = :department'
    );
    $insertProgramCourse = $pdo->prepare(
        'INSERT INTO program_courses (program_id, course_id, recommended_year)
         SELECT p.program_id, c.course_id, :year FROM programs p CROSS JOIN courses c
         WHERE p.program_code = :program AND c.course_code = :code'
    );
    foreach ($courses as [$code, $title, $units, $department]) {
        preg_match('/^([A-Z])[A-Z]*\s*(\d+)$/', $code, $courseIdParts);
        if (!$courseIdParts) {
            throw new RuntimeException('Course code must contain a prefix and a numeric course number: ' . $code);
        }
        $courseId = $courseIdParts[1] . '-' . str_pad($courseIdParts[2], 2, '0', STR_PAD_LEFT);
        $insertCourse->execute(['id' => $courseId, 'code' => $code, 'title' => $title, 'units' => $units, 'department' => $department]);
        $recommendedYears = [
            'BSCS' => ['COSC 80' => 3, 'DCIT 26' => 3, 'COSC 85' => 3, 'DCIT 65' => 3, 'COSC 75' => 3, 'COSC 101' => 3, 'MATH 3' => 3],
            'BSIT' => ['COSC 80' => 3, 'DCIT 26' => 3, 'COSC 85' => 3, 'DCIT 65' => 3, 'COSC 75' => 3, 'COSC 101' => 3, 'MATH 3' => 3],
        ];
        foreach ($recommendedYears as $program => $courseYears) {
            $insertProgramCourse->execute(['year' => $courseYears[$code], 'program' => $program, 'code' => $code]);
        }
    }

    $activeTerm = $pdo->query(
        "SELECT term_id FROM academic_terms WHERE term_status = 'active' ORDER BY term_id DESC LIMIT 1"
    )->fetchColumn();
    if (!$activeTerm) {
        throw new RuntimeException('No active academic term is configured.');
    }
    $facultyForSection = [
        'BSIT-1A' => $accountIds['faculty@edutrack.edu'],
        'BSCS-2C' => $accountIds['lord.toletole@edutrack.edu'],
        'BSCS-3D' => $accountIds['lord.toletole@edutrack.edu'],
    ];
    $insertOffering = $pdo->prepare(
        'INSERT INTO course_offerings (course_id, term_id, section_code, faculty_user_id, capacity)
         SELECT course_id, :term_id, :section, :faculty_id, 40 FROM courses WHERE course_code = :course_code'
    );
    $getOffering = $pdo->prepare(
        'SELECT co.offering_id FROM course_offerings co JOIN courses c ON c.course_id = co.course_id
         WHERE co.term_id = :term_id AND co.section_code = :section AND c.course_code = :course_code'
    );
    $insertEnrollment = $pdo->prepare(
        'INSERT INTO enrollments (request_code, student_user_id, offering_id, enrollment_status)
         VALUES (:request_code, :student, :offering, \'approved\')'
    );
    $insertAssessment = $pdo->prepare(
        'INSERT INTO assessments (offering_id, assessment_name, max_score, weight_percent)
         VALUES (:offering, :name, 100, 0)'
    );
    $requestCodes = [];
    foreach (array_keys($facultyForSection) as $section) {
        foreach ($courses as [$code]) {
            $insertOffering->execute([
                'term_id' => $activeTerm,
                'section' => $section,
                'faculty_id' => $facultyForSection[$section],
                'course_code' => $code,
            ]);
            $getOffering->execute(['term_id' => $activeTerm, 'section' => $section, 'course_code' => $code]);
            $offeringId = (int)$getOffering->fetchColumn();
            foreach (['Quiz', 'Project', 'Exam'] as $assessment) {
                $insertAssessment->execute(['offering' => $offeringId, 'name' => $assessment]);
            }
        }
    }

    $getStudent = $pdo->prepare('SELECT user_id, student_number FROM student_profiles WHERE user_id = :id');
    foreach ([
        'student@edutrack.edu' => 'BSIT-1A',
        'rance@edutrack.edu' => 'BSCS-3D',
        'pol.samsung@edutrack.edu' => 'BSCS-2C',
    ] as $email => $section) {
        $getStudent->execute(['id' => $accountIds[$email]]);
        $student = $getStudent->fetch();
        foreach ($courses as [$code]) {
            $getOffering->execute(['term_id' => $activeTerm, 'section' => $section, 'course_code' => $code]);
            $offeringId = (int)$getOffering->fetchColumn();
            preg_match('/(\d+)\s*$/', $code, $numberMatch);
            $prefix = 'REQ-' . (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('dmy') . ($numberMatch[1] ?? '');
            $requestCode = $prefix;
            $suffix = 1;
            while (isset($requestCodes[$requestCode])) {
                $requestCode = $prefix . '-' . str_pad((string)++$suffix, 2, '0', STR_PAD_LEFT);
            }
            $requestCodes[$requestCode] = true;
            $insertEnrollment->execute([
                'request_code' => $requestCode,
                'student' => $student['user_id'],
                'offering' => $offeringId,
            ]);
        }
    }

    $pdo->commit();
    fwrite(STDOUT, "EduTrack demo reset complete: 3 students, 2 faculty, one registrar, one admin; 7 courses in 3 sections.\n");
    fwrite(STDOUT, "All demo passwords are: password\n");
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
