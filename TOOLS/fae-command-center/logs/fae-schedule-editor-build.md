Build a Supabase-backed Court Schedule that is the SINGLE source of truth, editable, auto-logged, and synced across devices (home ↔ front desk). This is for the F.A.E. front desk — the owner's wife manages it and must never be confused about who is on the court. Keep the FAE brand: void black #050507 + gold #C9A227, fonts Archivo (display) / DM Sans (body) / JetBrains Mono (mono).

Use the existing Supabase tables `bookings` and `activity_log`, and the `has_staff_access` helper for RLS. Do NOT create a second schedule anywhere — this replaces any local/duplicate schedule.

1. SCHEDULE PAGE (staff, at /admin/schedule or the existing admin area):
   - A clear day view (default = TODAY) plus a week view toggle, showing every booking: court, date, start–end time, renter/booker name, contact, purpose/program, status (confirmed / pending / cancelled).
   - Big, unmistakable "TODAY" header with the current date and day name so the front desk reads it at a glance.
   - Empty/available slots visibly distinct from booked ones.

2. EDIT INTERFACE (staff only, gated by has_staff_access):
   - Add booking, edit booking, cancel/delete booking — inline forms/modals writing to the `bookings` table.
   - Prevent obvious double-bookings (same court + overlapping time) with a clear warning.

3. LOGGING (every change): On every create / update / cancel / delete of a booking, write a row to `activity_log` capturing who (current user), action, the booking id, and a before→after summary of what changed. Show a "Change history" panel on the schedule page reading from activity_log, newest first.

4. MULTI-DEVICE SYNC: Reads should reflect other devices' changes (Supabase realtime subscription or refetch on focus), so an edit made at home appears at the court and vice-versa.

5. GOOGLE SHEET = EXPORTABLE COPY ONLY: Add an "Export schedule" action that downloads the current schedule as CSV (and/or XLSX) on request — this is the copy the wife can request/keep. The Google Sheet is no longer the editing surface; the Supabase schedule is. If a one-way push to the existing Google Sheet is easy, add a manual "Export to Google Sheet" button, but the canonical editable schedule is Supabase.

6. RLS / SECURITY: Staff-only for edits via has_staff_access; keep any evidence/attachments in private buckets with signed URLs (workspace blocks public buckets).

Deliver this as one build. If credits run short, prioritize items 1–4 (view + edit + logging + sync); items 5–6 can follow.