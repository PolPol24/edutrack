<?php
declare(strict_types=1);

if ($argc !== 3) {
    fwrite(STDERR, "Usage: php import_ay2026_2027_first_semester.php <api-config.php> <schedule.tsv>\n");
    exit(2);
}

require $argv[1];
$pdo = database();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$courseCatalog = [
    'COSC 100' => ['Automata Theory and Formal Languages', 3, 'CS'],
    'COSC 101' => ['CS Elective 1 (Computer Graphics and Visual Computing)', 3, 'CS'],
    'COSC 105' => ['Intelligent Systems', 3, 'CS'],
    'COSC 111' => ['CS Elective 3 (Internet of Things)', 3, 'CS'],
    'COSC 200A' => ['Undergraduate Thesis I', 3, 'CS'],
    'COSC 50' => ['Discrete Structure', 3, 'CS'],
    'COSC 55' => ['Discrete Structures II', 3, 'CS'],
    'COSC 60' => ['Digital Logic Design', 3, 'CS'],
    'COSC 75' => ['Software Engineering II', 3, 'CS'],
    'COSC 80' => ['Operating Systems', 3, 'CS'],
    'COSC 85' => ['Networks and Communication', 3, 'CS'],
    'CvSU 101' => ['Institutional Orientation', 1, 'GE'],
    'DCIT 21' => ['Introduction to Computing', 3, 'CS'],
    'DCIT 22' => ['Computer Programming 1', 3, 'CS'],
    'DCIT 24' => ['Information Management', 3, 'CS'],
    'DCIT 26' => ['Applications Development and Emerging Technologies', 3, 'IT'],
    'DCIT 50' => ['Object-Oriented Programming', 3, 'CS'],
    'DCIT 60' => ['Methods of Research', 3, 'IT'],
    'DCIT 65' => ['Social and Professional Issues', 3, 'IT'],
    'FITT 1' => ['Movement Enhancement', 2, 'GE'],
    'FITT 3' => ['Physical Activities Toward Health and Fitness 1', 2, 'GE'],
    'GNED 02' => ['Ethics', 3, 'GE'],
    'GNED 04' => ['Mga Babasahin Hinggil sa Kasaysayan ng Pilipinas', 3, 'GE'],
    'GNED 05' => ['Purposive Communication', 3, 'GE'],
    'GNED 07' => ['Art Appreciation', 3, 'GE'],
    'GNED 10' => ['Gender and Society', 3, 'GE'],
    'GNED 11' => ['Kontekstwalisadong Komunikasyon sa Filipino', 3, 'GE'],
    'GNED 12' => ['Dalumat ng/sa Filipino', 3, 'GE'],
    'INSY 50' => ['Fundamentals of Information System', 3, 'CS'],
    'INSY 55' => ['System Analysis and Design', 3, 'IS'],
    'ITEC 110' => ['Systems Administration and Maintenance', 3, 'IT'],
    'ITEC 111' => ['IT Elective 3 (Integrated Programming and Technologies 2)', 3, 'IT'],
    'ITEC 116' => ['IT Elective 4 (Systems Integration and Architecture 2)', 3, 'IT'],
    'ITEC 200B' => ['Capstone Project and Research 2', 3, 'IT'],
    'ITEC 55' => ['Platform Technologies', 3, 'IT'],
    'ITEC 80' => ['Introduction to Human Computer Interaction', 3, 'IT'],
    'ITEC 85' => ['Information Assurance and Security 1', 3, 'IT'],
    'ITEC 90' => ['Network Fundamentals', 3, 'IT'],
    'MATH 1' => ['Analytic Geometry', 3, 'GE'],
    'MATH 3' => ['Linear Algebra', 3, 'GE'],
    'NSTP 1' => ['National Service Training Program 1', 3, 'GE'],
];

$file = fopen($argv[2], 'rb');
if (!$file) {
    throw new RuntimeException('Could not open schedule TSV.');
}
$headers = fgetcsv($file, 0, "\t");
$rows = [];
while (($values = fgetcsv($file, 0, "\t")) !== false) {
    if (count($values) !== count($headers)) {
        throw new RuntimeException('Schedule TSV contains a malformed row.');
    }
    $rows[] = array_combine($headers, $values);
}
fclose($file);

$seenCodes = array_values(array_unique(array_column($rows, 'course_code')));
$unmapped = array_values(array_diff($seenCodes, array_keys($courseCatalog)));
if ($unmapped) {
    throw new RuntimeException('No course details for: ' . implode(', ', $unmapped));
}
if (count($rows) !== 313 || count(array_unique(array_column($rows, 'section'))) !== 30) {
    throw new RuntimeException('Expected 313 schedule entries across 30 sections; import stopped.');
}

$pdo->beginTransaction();
try {
    $programs = $pdo->query("SELECT program_code, program_id FROM programs WHERE program_code IN ('BSCS', 'BSIT')")
        ->fetchAll(PDO::FETCH_KEY_PAIR);
    if (count($programs) !== 2) {
        throw new RuntimeException('Both BSCS and BSIT must exist before importing.');
    }
    $term = $pdo->query("SELECT term_id FROM academic_terms t JOIN academic_years y ON y.academic_year_id=t.academic_year_id WHERE t.term_name='1st semester' AND y.year_label='2026-2027'")
        ->fetchColumn();
    if (!$term) {
        throw new RuntimeException('The 1st semester 2026-2027 term was not found.');
    }
    foreach (['courses', 'program_courses', 'course_offerings', 'class_meetings'] as $table) {
        if ((int)$pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn() !== 0) {
            throw new RuntimeException("Table {$table} is not empty; import stopped to avoid mixing data.");
        }
    }
    $departmentIds = $pdo->query('SELECT department_code, department_id FROM departments')->fetchAll(PDO::FETCH_KEY_PAIR);
    $activePrograms = $pdo->prepare("UPDATE programs SET is_active = CASE WHEN program_code IN ('BSCS', 'BSIT') THEN 1 ELSE 0 END");
    $activePrograms->execute();

    $insertCourse = $pdo->prepare('INSERT INTO courses (course_id, course_code, course_title, units, department_id) VALUES (?, ?, ?, ?, ?)');
    foreach ($seenCodes as $code) {
        [$title, $units, $departmentCode] = $courseCatalog[$code];
        $courseId = strtoupper(str_replace(' ', '-', $code));
        $insertCourse->execute([$courseId, $code, $title, $units, $departmentIds[$departmentCode] ?? null]);
    }

    $sectionCourses = [];
    foreach ($rows as $row) {
        [$programCode, $year] = explode('-', $row['section']);
        $sectionCourses[$programCode][$row['course_code']] = min(
            $sectionCourses[$programCode][$row['course_code']] ?? 4,
            (int)$year
        );
    }
    $insertProgramCourse = $pdo->prepare('INSERT INTO program_courses (program_id, course_id, is_required, recommended_year, recommended_semester) VALUES (?, ?, 1, ?, 1)');
    foreach ($sectionCourses as $programCode => $courses) {
        foreach ($courses as $code => $year) {
            $insertProgramCourse->execute([$programs[$programCode], strtoupper(str_replace(' ', '-', $code)), $year]);
        }
    }

    $offeringMap = [];
    $offeringOrdinal = 1;
    $insertOffering = $pdo->prepare("INSERT INTO course_offerings (course_number, course_id, term_id, section_code, instructor_name, capacity, offering_status) VALUES (?, ?, ?, ?, ?, 10, 'open')");
    $insertMeeting = $pdo->prepare('INSERT INTO class_meetings (offering_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?)');
    foreach ($rows as $row) {
        $code = $row['course_code'];
        $section = $row['section'];
        $key = $section . '|' . $code;
        if (!isset($offeringMap[$key])) {
            $courseNumber = '20261' . str_pad((string)$offeringOrdinal++, 4, '0', STR_PAD_LEFT);
            $insertOffering->execute([$courseNumber, strtoupper(str_replace(' ', '-', $code)), $term, $section, $row['instructor'] !== '' ? $row['instructor'] : null]);
            $offeringMap[$key] = (int)$pdo->lastInsertId();
        }
        if (preg_match('/^\d{2}:\d{2}$/', $row['start']) && preg_match('/^\d{2}:\d{2}$/', $row['end'])) {
            $insertMeeting->execute([$offeringMap[$key], strtolower($row['day']), $row['start'] . ':00', $row['end'] . ':00', $row['room'] ?: null]);
        }
    }
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $error;
}

$summary = $pdo->query("SELECT (SELECT COUNT(*) FROM courses) AS courses, (SELECT COUNT(*) FROM program_courses) AS program_courses, (SELECT COUNT(*) FROM course_offerings) AS offerings, (SELECT COUNT(*) FROM class_meetings) AS meetings, (SELECT COUNT(DISTINCT section_code) FROM course_offerings) AS sections")->fetch();
$active = $pdo->query('SELECT GROUP_CONCAT(program_code ORDER BY program_code SEPARATOR ", ") FROM programs WHERE is_active=1')->fetchColumn();
echo json_encode(['active_programs' => $active, 'summary' => $summary], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
