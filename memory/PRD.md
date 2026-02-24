# Routes International - Nurse Recruitment Workflow System PRD

## Original Problem Statement
Corporate nurse recruitment workflow management system with three secured panels (Admin, Staff, Public Tracker), 14-stage pipeline, document list tracking, payment approval, stage locking, and audit control.

## Architecture
- **Frontend**: React 19 + TailwindCSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: JWT-based with bcrypt password hashing

## User Personas
1. **Admin**: System administrator — manages staff, approves payments, searches candidates, views audit logs
2. **Staff**: Recruitment staff — manages candidates, registers (incoming/outgoing/return/exit), updates stages
3. **Candidate (Public)**: Nurse candidates tracking application status

## Core Requirements
- Role-based access (Admin, Staff, Public)
- 14-stage workflow pipeline
- Document list tracking (text only, no uploads)
- Payment approval system (admin only)
- Exit validation (requires approved payment)
- Stage locking (staff can lock, only admin can unlock)
- IP tracking and audit logging
- Public candidate status tracker

## What's Been Implemented (Feb 23, 2026)
- Admin Panel with sidebar: Dashboard, Candidate Search (Flowchart + Quick Actions), Payments, Staff Mgmt, Audit Logs
- Staff Panel with tabs: Candidates, Incoming, Outgoing, Return, Exit, Stage Management
- Public Candidate Tracker with progress stepper
- Loading/splash page with nurse animation
- Split-screen login with hidden admin toggle
- Full 14-stage workflow pipeline
- All 4 registers (Incoming, Outgoing, Return, Exit)
- Auto-fetch incoming documents for outgoing register
- Auto-fetch incoming+outgoing for return register
- Payment approval/rejection system
- Exit blocked without approved payment
- Stage locking with checkboxes (Attestation, Dataflow, Prometric, Documents)
- Audit logging (login/logout/failed attempts with IP)
- JWT auth with role-based access control
- **NEW: Smart Notification & Due Date System** (replaces pipeline chart)
  - Color-coded alert counts: Overdue (red), Due Soon (yellow), On Track (green), Pending (grey), Waiting (blue)
  - Automatic alerts for: pending docs, dataflow not started, prometric pending, attestation not returned, payment pending, VISA waiting
  - Bell notification icon with dropdown in both Admin and Staff dashboards
  - Due date support for major stages (Dataflow, Prometric, Attestation, Medical, VFS, VISA)
- **NEW: Admin Quick Action Buttons** in Candidate Profile
  - 7 stage buttons: Dataflow, Prometric, Attestation, Medical, VFS, VISA, Exit
  - Visual states: Grey (not started), Blue (in progress), Green (completed), Red badge (overdue)
  - Each button can: mark status, set due date, add remarks, lock stage

## Test Results
- Backend: 93.3% pass
- Frontend: 95.0% pass
- Overall: 94.2% pass

## Backlog (P0-P2)
### P0 (Critical)
- None remaining

### P1 (Important)
- Email triggers on stage change (SendGrid/Resend integration)
- Document pending alerts
- Activity timeline for candidates
- Bulk candidate import

### P2 (Nice to Have)
- Dark mode toggle
- Export audit logs as CSV
- Dashboard charts with Recharts
- Mobile app optimization
- Multi-language support

## Next Tasks
1. Email notification integration on stage changes
2. Enhanced dashboard analytics with charts
3. Candidate document checklist with status indicators
4. Bulk operations (import/export)
