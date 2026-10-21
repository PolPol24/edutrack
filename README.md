# EduTrack - Student Information System

EduTrack uses a Next.js/JavaScript frontend with a PHP API and MySQL database.
XAMPP provides Apache, PHP, MySQL, and phpMyAdmin for local development.

## Run with XAMPP

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open `http://localhost/phpmyadmin`, select **Import**, and import
   [`database/edutrack_db.sql`](./database/edutrack_db.sql). This creates the
   `edutrack_db` database, schema, and starter catalog.
   For an existing database, run
   [`database/migrations/20261021_student_registration_approval.sql`](./database/migrations/20261021_student_registration_approval.sql)
   once in phpMyAdmin before using student registration.
3. Copy the contents of [`backend/`](./backend) into
   `C:\xampp\htdocs\edutrack-api\`. The API URL should then be
   `http://localhost/edutrack-api/api.php`.
4. In that XAMPP folder, copy `local_config.php.example` to `local_config.php`.
   Set the MySQL password if your XAMPP `root` account has one. The example uses
   XAMPP's common local defaults: host `127.0.0.1`, port `3306`, database
   `edutrack_db`, user `root`, and an empty password.
5. Open PowerShell and create local demo accounts and course offerings:

   ```powershell
   C:\xampp\php\php.exe C:\xampp\htdocs\edutrack-api\setup_demo.php
   ```

   The local demo accounts use the password `password`:

   - Student: `student@edutrack.edu`
   - Faculty: `faculty@edutrack.edu`
   - Faculty: `lord.toletole@edutrack.edu`
   - Additional faculty: `amara.delacruz@edutrack.edu`, `joaquin.padilla@edutrack.edu`, `bianca.manalo@edutrack.edu`, `luis.romero@edutrack.edu`, `patricia.alonzo@edutrack.edu`, and `vincent.chua@edutrack.edu`
   - Registrar: `registrar@edutrack.edu`
   - Admin: `admin@edutrack.edu`

   To add only the six additional faculty accounts to an existing database without resetting other demo data, run:

   ```powershell
   C:\xampp\php\php.exe C:\xampp\htdocs\edutrack-api\add_demo_faculty.php
   ```

6. In the project directory, start the frontend:

   ```powershell
   $env:Path = 'C:\Program Files\nodejs;' + $env:Path
   & 'C:\Program Files\nodejs\npm.cmd' install
   & 'C:\Program Files\nodejs\npm.cmd' run dev -- -p 3001
   ```

7. Open `http://localhost:3001`. Sign-in, enrollment requests, registrar
   approvals, faculty grades and attendance, student and staff profiles, admin
   accounts, courses, settings, and reports use the PHP API and persist to MySQL.
   Students can choose **Register here** on the sign-in page. Their registration
   request stays pending until a registrar assigns a program and year level and
   approves it; only then is an active login and student profile created.

Use **Log out** in the navigation to sign out and return to the login screen
between presentations. The demo accounts are listed above; each uses the
password `password`.

The frontend defaults to `http://localhost/edutrack-api/api.php`. To use a
different API URL, set `NEXT_PUBLIC_EDUTRACK_API_URL` in a project-root
`.env.local` file and restart Next.js. If the frontend origin changes, add that
exact origin to `allowed_origins` in `local_config.php`. The provided local
configuration allows both frontend ports 3000 and 3001.

## Included backend actions

- `POST ?action=login`, `GET ?action=me`, and `POST ?action=logout`
- `GET ?action=courses` for active course offerings
- `GET|POST|DELETE ?action=enrollments` for student requests
- `GET|PATCH ?action=approvals` for registrar review
- `POST ?action=student_registrations` submits a student signup request; the
  registrar review checks the student number, name, suffix, and date of birth
  against the separate `campus_student_registry` before approval. Approval
  copies the preassigned program and year level into the student profile.
- `GET|POST ?action=registrar_enrollment` lets registrars preview a student’s
  year and semester curriculum, then enroll them in all required subjects.
- `GET|POST|PATCH ?action=registrar_sections` forms the three program sections,
  creates unique course numbers for subject sections, and assigns active
  faculty to each course number.
- Profile, student roster/course/attendance, admin account/catalog/settings,
  and database report actions for the role pages

PHP uses PDO with prepared statements, password hashes, role checks, and
server-side sessions. Keep `local_config.php` private and change or remove the
demo passwords before using the system outside a local development environment.
The campus roster contains 50 sample students per program, split evenly across
sections A, B, and C. The original roster uses `202600001` through `202600050`
for BSIT; the registrar program section migration adds the BSIS and BSCS sample
cohorts.
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
