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
        'DELETE FROM class_meetings',
        'DELETE FROM enrollments',
        'DELETE FROM student_section_assignments',
        'UPDATE system_settings SET updated_by_user_id = NULL',
        'DELETE FROM course_offerings',
        'DELETE FROM program_courses',
    ] as $sql) {
        $pdo->exec($sql);
    }

    $accounts = [
        ['Alyssa Cruz', 'student@edutrack.edu', 'student', 'BSIT', 1],
        ['Zedrick Tolentino', 'rance@edutrack.edu', 'student', 'BSCS', 3],
        ['Pol Samsung', 'pol.samsung@edutrack.edu', 'student', 'BSCS', 2],
        ['Ramon Villanueva', 'registrar@edutrack.edu', 'registrar', null, null],
        ['EduTrack Administrator', 'admin@edutrack.edu', 'admin', null, null],
    ];
    $allowedEmails = array_column($accounts, 1);
    $placeholders = implode(',', array_fill(0, count($allowedEmails), '?'));
    $removeOthers = $pdo->prepare("DELETE FROM users WHERE email NOT IN ($placeholders)");
    $removeOthers->execute($allowedEmails);

    $upsertUser = $pdo->prepare(
        'INSERT INTO users (full_name, first_name, last_name, email, password_hash, role, account_status)
         VALUES (:full_name, :first_name, :last_name, :email, :password_hash, :role, \'active\')
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), first_name = VALUES(first_name),
           last_name = VALUES(last_name), password_hash = VALUES(password_hash),
           role = VALUES(role), account_status = \'active\''
    );
    $getUser = $pdo->prepare('SELECT user_id, created_at FROM users WHERE email = :email');
    $getProgram = $pdo->prepare('SELECT program_id FROM programs WHERE program_code = :program_code');
    $upsertStudent = $pdo->prepare(
        'UPDATE users SET student_number = :student_number, program_id = :program_id,
             year_level = :year_level, student_status = \'active\'
         WHERE user_id = :user_id'
    );
    $upsertEmployee = $pdo->prepare(
        'UPDATE users SET employee_number = :employee_number, department_id = :department_id
         WHERE user_id = :user_id'
    );
    $findDepartment = $pdo->prepare('SELECT department_id FROM departments WHERE department_code = :code');
    $passwordHash = password_hash('password', PASSWORD_DEFAULT);
    $accountIds = [];
    $usedNumbers = [];

    foreach ($accounts as [$name, $email, $role, $programCode, $yearLevel]) {
        [$firstName, $lastName] = array_pad(explode(' ', $name, 2), 2, '');
        $upsertUser->execute([
            'full_name' => $name,
            'first_name' => $firstName,
            'last_name' => $lastName,
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
            $departmentCode = null;
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
    $demoSections = ['BSIT-1A', 'BSCS-2C', 'BSCS-3D'];
    $instructorAssignments = [
        'BSIT-1A' => [
            'Maria Elena Santos' => ['DCIT 26', 'COSC 80'],
            'Lord Toletole' => ['COSC 85', 'DCIT 65'],
            'Patricia Alonzo' => ['MATH 3'],
        ],
        'BSCS-2C' => [
            'Maria Elena Santos' => ['COSC 80', 'DCIT 26'],
            'Amara Dela Cruz' => ['COSC 85', 'DCIT 65'],
            'Joaquin Padilla' => ['MATH 3'],
            'Vincent Chua' => ['COSC 101'],
        ],
        'BSCS-3D' => [
            'Maria Elena Santos' => ['COSC 75', 'COSC 101'],
            'Bianca Manalo' => ['MATH 3', 'COSC 80'],
            'Luis Romero' => ['DCIT 26'],
        ],
    ];
    $insertOffering = $pdo->prepare(
        'INSERT INTO course_offerings (course_id, term_id, section_code, instructor_name, capacity)
         SELECT course_id, :term_id, :section, NULL, 40 FROM courses WHERE course_code = :course_code'
    );
    $getOffering = $pdo->prepare(
        'SELECT co.offering_id FROM course_offerings co JOIN courses c ON c.course_id = co.course_id
         WHERE co.term_id = :term_id AND co.section_code = :section AND c.course_code = :course_code'
    );
    $assignInstructorReference = $pdo->prepare(
        'UPDATE course_offerings co
         JOIN courses c ON c.course_id = co.course_id
         SET co.instructor_name = :instructor_name
         WHERE co.term_id = :term_id
           AND co.section_code = :section
           AND c.course_code = :course_code'
    );
    $insertEnrollment = $pdo->prepare(
        'INSERT INTO enrollments (request_code, student_user_id, offering_id, enrollment_status)
         VALUES (:request_code, :student, :offering, \'approved\')'
    );
    $requestCodes = [];
    foreach ($demoSections as $section) {
        foreach ($courses as [$code]) {
            $insertOffering->execute([
                'term_id' => $activeTerm,
                'section' => $section,
                'course_code' => $code,
            ]);
        }
    }

    foreach ($instructorAssignments as $section => $teachers) {
        foreach ($teachers as $instructorName => $courseCodes) {
            foreach ($courseCodes as $courseCode) {
                $assignInstructorReference->execute([
                    'instructor_name' => $instructorName,
                    'term_id' => $activeTerm,
                    'section' => $section,
                    'course_code' => $courseCode,
                ]);
            }
        }
    }

    // A weekly attendance trial class for the demo BSIT student.
    $trialMeeting = $pdo->prepare(
        'INSERT INTO class_meetings (offering_id, day_of_week, start_time, end_time, room)
         SELECT co.offering_id, \'friday\', \'16:30:00\', \'18:00:00\', \'Room 201\'
         FROM course_offerings co
         JOIN courses c ON c.course_id = co.course_id
         WHERE co.term_id = :term_id AND co.section_code = \'BSIT-1A\' AND c.course_code = \'DCIT 26\'
           AND NOT EXISTS (
             SELECT 1 FROM class_meetings cm
             WHERE cm.offering_id = co.offering_id AND cm.day_of_week = \'friday\'
               AND cm.start_time = \'16:30:00\' AND cm.end_time = \'18:00:00\' AND cm.room = \'Room 201\'
           )'
    );
    $trialMeeting->execute(['term_id' => $activeTerm]);

    $getStudent = $pdo->prepare('SELECT user_id, student_number FROM users WHERE user_id = :id AND role = \'student\'');
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
    fwrite(STDOUT, "EduTrack demo reset complete: 3 students, instructor references, one registrar, one admin; 7 courses in 3 sections.\n");
    fwrite(STDOUT, "Student, registrar, and admin demo passwords are: password\n");
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
