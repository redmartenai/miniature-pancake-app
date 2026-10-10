# EduFlow web — screens, routes and APIs

Design source: the `eduflow-app` prototype in `Downloads/School Om nammah shivaya` (layouts, palette, motion; `src/components/ui` is copied from it verbatim apart from brand-aware colours). Role and screen inventory: `EduFlow_Full_Screen_Documentation.docx` (identical to `EDUflow.docx`).
API source: `legendary-waffle-skl` branch `phase-6/attendance-white-label`, `docs/api/openapi.yaml` (generated into `src/api/schema.d.ts` by `npm run api:types`).

"Blocked" screens keep their design's place and header and show which backend capability is missing (`src/lib/blockers.ts`). No screen shows invented data.

## Sign-in and gates (all roles)

| Screen | Route | APIs |
|---|---|---|
| Branding before sign-in | every route | `GET /branding/resolve?host=` (public); default EduFlow branding on failure |
| Sign in · password | `/sign-in` | `POST /auth/password/login` |
| Sign in · phone code | `/sign-in` | `POST /auth/otp/request`, `POST /auth/otp/verify` |
| Forced password change | (gate) | `POST /auth/password/change`, `GET /me` |
| Choose school | (gate) | `GET /me/permissions`, `GET /branding` (with `X-School-Id`) |
| No access / no workspace for role | (gate) | — |
| Sign out | account menu | `POST /auth/logout` |

Role → experience: `principal` → Principal; `school_admin`, `accountant`, `hr_manager` → Admin; `teacher` → Teacher; `parent` → Parent; `student` → Student. Other roles (librarian, transport, hostel, driver, staff, custom) and platform admins have no supplied design and see an explanation.

## Principal — web `/principal/*`, mobile `/m/principal`

| Screen | Route | Status | APIs |
|---|---|---|---|
| Monitoring Center (hero, register wall, activity) | `/principal` | Partial | `/attendance/sessions?date=`, `/sections`, `/teacher-assignments`, `/enrollments`, `/attendance/corrections?status=pending`, `/audit-events`, `/school`. Alerts, staff-in, buses, fees: blocked |
| Students + student sheet | `/principal/students?s=` | Partial | `/students`, `/enrollments`, `/students/{id}`, `/students/{id}/attendance?month=`, `/student-guardians`, `/guardians`. Marks, fees, risk, remarks: blocked |
| Staff + staff sheet | `/principal/staff?t=` | Partial | `/staff`, `/teacher-assignments`. Scorecards, who-is-in: blocked |
| Academics (classes × subjects) | `/principal/academics` | Partial | `/subjects`, `/teacher-assignments`, `/sections`. Marks status/publishing: blocked |
| Attendance | `/principal/attendance` | Live | `/attendance/sessions` (today and 100-day window), `/attendance/records?status=absent` |
| Approvals | `/principal/approvals` | Live (corrections) | `/attendance/corrections`, `POST …/{id}/approve`, `POST …/{id}/decline`. Leave/refund/admission: blocked |
| Communication, Fees, Transport, Ask, Campus 3D | `/principal/{communication,fees,transport,ask,campus}` | Blocked | — |
| Mobile: Today, Wall, Approvals, Ask, People | `/m/principal` | Partial | as above, plus `/attendance/records?session_id=` |

## Admin — web `/admin/*`, mobile `/m/admin`

| Screen | Route | Status | APIs |
|---|---|---|---|
| Control room | `/admin` | Partial | `/attendance/corrections`, `/audit-events`, `/memberships`. Collections, payroll, admissions: blocked |
| Fees, Payroll, Admissions | `/admin/{fees,payroll,admissions}` | Blocked | — |
| Staff & HR | `/admin/staff` | Partial | `/staff`. Leave, punctuality: blocked |
| Access control | `/admin/access` | Live | `/roles`, `/permissions`, `PATCH /roles/{id}`, `/audit-events?action=authz.role.updated` |
| Audit log | `/admin/audit` | Live | `/audit-events` (cursor pages), `/memberships` for names |
| Mobile: Home, Fees, Payroll, Admissions, Approvals | `/m/admin` | Partial | corrections; the rest blocked |

## Teacher — `/m/staff`

| Screen | Status | APIs |
|---|---|---|
| Today: register card, your day | Live | `/staff` (own record), `/teacher-assignments?staff_id=`, `/classes/{id}/roster?date=`, `/schedule/me` |
| Register (take / change / request correction) | Live | `GET /classes/{id}/roster`, `POST /classes/{id}/attendance` (exceptions only, stable `client_id`), `/attendance/records`, `POST /attendance/corrections` |
| Classes → class → child | Partial | `/enrollments?section_id=`, roster, `/students/{id}/attendance`, guardians. Homework, marks, remarks, messaging: blocked |
| Learn, Messages | Blocked | — |
| Me | Partial | `/staff`, `/me`. Scorecard, announcements, leave, payslip: blocked |

## Parent — `/m/parent`

| Screen | Status | APIs |
|---|---|---|
| Today (child switcher, today's mark, attendance tile) | Partial | `/students` (`child` scope), `/enrollments`, `/students/{id}/attendance?month=`. Timeline, marks, fees, notes, "worth a look": blocked |
| Attendance calendar | Live | `/students/{id}/attendance?month=` |
| Learning, Bus, Messages | Blocked | — |
| More (linked children, account) | Partial | as Today. Fees, notifications, PTM: blocked |

## Student — `/m/student`

| Screen | Status | APIs |
|---|---|---|
| Home (month in school, now/next) | Partial | `/students` (`self`), `/students/{id}/attendance`, `/schedule/me`. Homework, next paper, house points: blocked |
| Learn, Homework, Results | Blocked | — |
| Me (record, attendance calendar, week timetable) | Live | `/students`, `/enrollments`, `/students/{id}/attendance`, `/schedule/me` |

## Backend contract notes

- `GET /audit-events` returns a cursor page (`{next, previous, results}`, `audit/api/views.py`) while the OpenAPI document declares a bare array.
- The backend sends no CORS headers: the API must be same-origin (Vite dev proxy, reverse proxy in production).
- Web tokens are kept in memory only, as the backend's security docs require until its cookie flow exists; a page reload signs the user out.
