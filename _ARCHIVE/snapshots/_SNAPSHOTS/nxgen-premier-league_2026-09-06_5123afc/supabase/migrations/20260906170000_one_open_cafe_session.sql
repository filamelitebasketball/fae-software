-- One café session per member at a time.
--
-- Two taps on "Start session" created two open rows. The till then reads the
-- open session with `.maybeSingle()`, which errors when it finds two — and
-- because the whole charge panel is gated on having loaded a wallet, that
-- member's till silently disappeared until somebody fixed it in SQL. A
-- double-tap did not just double-bill, it locked the counter out of that
-- account.
--
-- There was already a partial index here, but it was not unique, so it only
-- made the duplicate fast to find. This refuses it outright, and the screen
-- turns the resulting 23505 into "this member already has a session running".

create unique index if not exists cafe_sessions_one_open_per_user
  on public.cafe_sessions (user_id) where ended_at is null;

comment on index public.cafe_sessions_one_open_per_user is
  'A member can only have one café session running. The till reads the open session with maybeSingle(), which errors on two rows and blanks the whole panel.';
