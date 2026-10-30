# EduTrack - Student Information System

EduTrack uses a Next.js/JavaScript frontend with a PHP API and MySQL database.
XAMPP provides Apache, PHP, MySQL, and phpMyAdmin for local development.

## Run with XAMPP

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open `http://localhost/phpmyadmin`, select **Import**, and import
   [`database/edutrack_db.sql`](./database/edutrack_db.sql). This creates the
   `edutrack_db` database, schema, and starter catalog.
   For an existing database, back it up first and apply any outstanding
   migrations from the current schema in date order. This includes
   [`database/migrations/20261021_student_registration_approval.sql`](./database/migrations/20261021_student_registration_approval.sql)
   if it has not already been applied. Then run the user consolidation and
   view cleanup migrations in order:
   [`database/migrations/20261030_unified_users_retire_faculty.sql`](./database/migrations/20261030_unified_users_retire_faculty.sql)
   consolidates account profiles and retires faculty accounts, followed by
   [`database/migrations/20261031_remove_redundant_views.sql`](./database/migrations/20261031_remove_redundant_views.sql)
   to remove compatibility and reporting views, and
   [`database/migrations/20261101_remove_grading_system.sql`](./database/migrations/20261101_remove_grading_system.sql)
   to remove grading tables, followed by
   [`database/migrations/20261102_remove_unused_schedule_attendance.sql`](./database/migrations/20261102_remove_unused_schedule_attendance.sql)
   to remove schedule and attendance tables that have no entry workflow. The
   [`database/migrations/20261103_reduce_campus_registry_samples.sql`](./database/migrations/20261103_reduce_campus_registry_samples.sql)
   migration trims the demo campus roster to two students. The
   [`database/migrations/20261104_student_schedule_and_document_registration.sql`](./database/migrations/20261104_student_schedule_and_document_registration.sql)
   migration adds the student timetable and document-submission workflow,
   followed by
   [`database/migrations/20261105_face_recognition_attendance.sql`](./database/migrations/20261105_face_recognition_attendance.sql)
   which adds classroom kiosks, encrypted student face templates, attendance
   sessions and records, and correction audit logs. Then apply
   [`database/migrations/20261107_upgrade_qr_attendance_to_face.sql`](./database/migrations/20261107_upgrade_qr_attendance_to_face.sql)
   to add face-specific settings and verification methods and remove old QR
   tokens from a database that previously used QR attendance. Then apply
   [`database/migrations/20261108_friday_face_trial_schedule.sql`](./database/migrations/20261108_friday_face_trial_schedule.sql)
   to schedule the demo BSIT-1A/DCIT 26 trial class every Friday from 4:30 PM to
   6:00 PM in Room 201 when that offering exists and the room is free. Student
   account registration does not require a campus roster entry; applicants
   submit their program and year level for registrar review.
   First-year applicants upload the PSA Birth Certificate, Form 137, and Good
   Moral Certificate with their account registration. The registrar reviews
   these documents from the registration request before approving the account.
   Apply the face attendance migration for both fresh and existing databases
   after importing the base schema; for an existing database, run it after any
   outstanding migrations through `20261104`, then the upgrade migration and
   trial schedule and roster migrations. Finally, apply
   [`database/migrations/20261110_compreface_face_recognition.sql`](./database/migrations/20261110_compreface_face_recognition.sql)
   to add the local CompreFace subject mappings. Existing databases must also
   apply
   [`database/migrations/20261111_student_registration_without_roster.sql`](./database/migrations/20261111_student_registration_without_roster.sql)
   to store each applicant's program and year level. The fresh-install schema
   already includes those columns. Apply
   [`database/migrations/20261112_student_registration_request_documents.sql`](./database/migrations/20261112_student_registration_request_documents.sql)
   to existing databases to store private PDF uploads with each first-year
   account registration request, then apply
   [`database/migrations/20261113_student_registration_phone.sql`](./database/migrations/20261113_student_registration_phone.sql)
   to capture the applicant's optional phone number. These migrations do not reset existing
   records. The consolidated schema stores login credentials and student/employee
   attributes directly in `users`. Instructor names on course offerings remain
   as references; grading and GPA are not supported. Attendance reuses the
   existing course, section, enrollment, and weekly class-meeting records.
3. Copy the contents of [`backend/`](./backend) into
   `C:\xampp\htdocs\edutrack-api\`. The API URL should then be
   `http://localhost/edutrack-api/api.php`.
4. In that XAMPP folder, copy `local_config.php.example` to `local_config.php`.
   Set the MySQL password if your XAMPP `root` account has one. Install and
   start Docker Desktop, then start the official CompreFace stack locally:

   ```powershell
   git clone https://github.com/exadel-inc/CompreFace.git
   Set-Location .\CompreFace
   docker compose up -d
   ```

   Open `http://localhost:8000`, create the local CompreFace admin account,
   create a **Recognition** service, and copy its API key. In
   `C:\xampp\htdocs\edutrack-api\local_config.php`, set `compreface_url` to
   `http://127.0.0.1:8000` and `compreface_api_key` to that service key. Keep
   this key private and do not expose it to frontend code. CompreFace stores
   uploaded face images in its local database volume; the service and its
   persistent volume must remain on this computer. PHP's cURL and fileinfo
   extensions must be enabled. The example uses
   XAMPP's common local defaults: host `127.0.0.1`, port `3306`, database
   `edutrack_db`, user `root`, and an empty password.
5. Open PowerShell and create local demo accounts and course offerings:

   ```powershell
   C:\xampp\php\php.exe C:\xampp\htdocs\edutrack-api\setup_demo.php
   ```

   The local demo accounts use the password `password`:

   - Student: `student@edutrack.edu`
   - Registrar: `registrar@edutrack.edu`
   - Admin: `admin@edutrack.edu`

6. In the project directory, start the frontend:

   ```powershell
   $env:Path = 'C:\Program Files\nodejs;' + $env:Path
   & 'C:\Program Files\nodejs\npm.cmd' install
   & 'C:\Program Files\nodejs\npm.cmd' run dev -- -p 3001
   ```

7. Open `http://localhost:3001`. Sign-in, enrollment requests, registrar
   approvals, student and staff profiles, admin accounts, courses, settings,
   and reports use the PHP API and persist to MySQL. Faculty portal pages and
   sign-in are removed; existing instructor names remain as reference-only
   assignments (there are no faculty/instructor user accounts or account views).
   Grade and GPA tracking are removed. Students can view published
   class meeting times in a Monday-to-Saturday timetable with 30-minute slots;
   blank cells mean no meeting time has been entered for that course. First-year
   students during the active first semester can submit three required PDF
   documents (up to 10 MB each) for registrar review.
   Students can choose **Register here** on the sign-in page. Their registration
   request stays pending until a registrar assigns a program and year level and
   approves it; only then is an active login and student profile created.
   Admins can schedule classroom meetings and pair camera kiosks from
   **Attendance**. The kiosk creates one face attendance session per scheduled
   class and date. Enrollment checks for a blink on-device, then sends five
   camera images through the PHP API to the self-hosted CompreFace service.
   CompreFace stores the face examples locally; registration examples stay
   associated with pending requests and are mapped to approved student accounts
   after registrar approval. Direct registrar student creation also requires
   explicit consent and face capture. Kiosks match against active students
   approved for that class only. Students can review attendance history and
   revoke enrollment, which removes their CompreFace subject; registrars can
   review and export reports, and attendance corrections require a reason and
   are recorded in an audit log.

Use **Log out** in the navigation to sign out and return to the login screen
between presentations. Sign-in persists across browser restarts for up to 30
days; choose **Log out** on shared devices. The demo accounts are listed above;
each uses the password `password`.

The frontend defaults to `http://localhost/edutrack-api/api.php`. To use a
different API URL, set `NEXT_PUBLIC_EDUTRACK_API_URL` in a project-root
`.env.local` file and restart Next.js. If the frontend origin changes, add that
exact origin to `allowed_origins` in `local_config.php`. The provided local
configuration allows both frontend ports 3000 and 3001.
Face attendance needs a browser camera and therefore requires HTTPS outside
`localhost`. The liveness model weight files are served locally from
`public/models`; no face-model CDN is used. Face images are sent only to the
local PHP API and self-hosted CompreFace service. Keep the Docker Compose
database volume private and use **Revoke face enrollment** to remove a student's
stored subject. A production release needs an independently verified liveness
pipeline and formal privacy review; the browser alone is not a trusted source
for anti-spoof scores.

## Included backend actions

- `POST ?action=login`, `GET ?action=me`, and `POST ?action=logout`
- `POST ?action=verify_dashboard_password` verifies the administrator password
  before leaving classroom kiosk mode
- `GET ?action=courses` for active course offerings
- `GET|POST|DELETE ?action=enrollments` for student requests
- `GET|PATCH ?action=approvals` for registrar review
- `GET|POST|PATCH ?action=attendance_admin` for admin schedules, kiosk pairing,
  attendance rules, and session controls
- `POST ?action=kiosk_state` for authenticated kiosk status and face check-in
- `GET ?action=student_attendance` for attendance history
- `GET|POST|DELETE ?action=student_face` for local CompreFace enrollment and revocation
- `GET|PATCH ?action=registrar_attendance` for attendance reports and audited corrections
- `GET ?action=student_schedule` returns approved classes and published meeting times
- `GET|POST ?action=student_document_registrations` lets eligible first-year,
  first-semester students submit three PDF documents for registrar review
- `GET|PATCH ?action=registrar_student_document_registrations` lists and reviews
  document submissions; `GET ?action=student_registration_document_file` serves
  submitted PDFs to authenticated registrars
- `POST ?action=student_registrations` submits a student signup request with
  locally stored CompreFace face images and a consent record. Students can
  register without a preloaded campus roster; registrar approval copies the
  submitted program and year level into the student profile.
- `GET|POST ?action=registrar_enrollment` lets registrars preview a student’s
  year and semester curriculum, then enroll them in all required subjects.
- `GET|POST|PATCH ?action=registrar_students` lists and creates student records;
  the registrar’s **Drop** action withdraws the student and suspends sign-in
  while retaining enrollment and academic history.
- `GET|POST|PATCH ?action=registrar_sections` forms the three program sections,
  creates unique course numbers for subject sections, records instructor names
  for reference, lets registrars assign active students to a section per
  semester, and auto-enrolls students into required courses for their assigned
  section. A student with enrollments in a semester can only be assigned to
  their current section until those enrollment records are updated.
- Profile, student roster/course, admin account/catalog/settings,
  and database report actions for the role pages

PHP uses PDO with prepared statements, password hashes, role checks, and
server-side sessions. Submitted documents are stored outside the web root and
are available only through the registrar-authenticated download action. Keep
`local_config.php` private and change or remove the demo passwords before using
the system outside a local development environment.
The campus roster contains two demo students for testing registration and
approval. Both are assigned to BSIT and sections A and B.
First- and second-semester curriculum samples for BSIT, BSIS, and BSCS are
seeded in `database/migrations/20261021_first_semester_21_unit_curricula.sql`
and `database/migrations/20261021_second_semester_21_unit_curricula.sql`.
They are marked for year 1; each first semester totals 21 units and each
second semester totals 23 units.
Other dashboard pages still contain frontend sample data and need their own API
integration before they read or write MySQL.

## XAMPP troubleshooting

- Confirm Apache and MySQL show **Running** in the XAMPP Control Panel.
- If PHP reports a missing MySQL driver, enable `pdo_mysql` in the active
  `C:\xampp\php\php.ini`, then restart Apache.
- If the API reports a database connection error, verify the credentials in
  `local_config.php` and confirm that the SQL import created `edutrack_db`.
- If the browser reports a CORS error, check that the frontend address is listed
  in `allowed_origins` and that frontend requests use `localhost` consistently.
