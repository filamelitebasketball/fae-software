
create schema if not exists app_private;

create or replace function app_private.player_row_is_public(_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when _profile_id is null then true
    else exists (
      select 1 from public.profiles p
      where p.id = _profile_id
        and coalesce(p.is_public, false) = true
        and p.consent_status <> 'pending'
    )
  end
$$;

revoke all on function app_private.player_row_is_public(uuid) from public;
grant execute on function app_private.player_row_is_public(uuid) to anon, authenticated, service_role;

-- 1. players: filter public reads
drop policy if exists "players_public_read" on public.players;
create policy "players_public_read" on public.players
for select to anon, authenticated
using (app_private.player_row_is_public(profile_id));

-- 2. player-photos storage follows the same visibility rule
drop policy if exists "Public read player-photos (public profiles/roster only)" on storage.objects;
create policy "Public read player-photos (public profiles/roster only)" on storage.objects
for select to public
using (
  bucket_id = 'player-photos'
  and (
    exists (
      select 1 from public.profiles p
      where p.id::text = split_part(objects.name, '/', 1)
        and coalesce(p.is_public, false) = true
        and p.consent_status <> 'pending'
    )
    or exists (
      select 1 from public.players pl
      where (pl.photo_url = objects.name
             or pl.photo_url like ('%/player-photos/' || objects.name))
        and app_private.player_row_is_public(pl.profile_id)
    )
  )
);

-- 3. site_settings: only whitelisted public keys are readable by everyone
drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read public site settings" on public.site_settings
for select to anon, authenticated
using (key = any (array[
  'maintenance_mode','gallery_visible','archive_visible','registration_open',
  'livestream_url','site_announcement','hero_badge_text','payment_note',
  'court_data_packages','hero_headline','hero_subheadline','about_text',
  'social_instagram','social_facebook','social_youtube','social_tiktok',
  'contact_email','contact_phone','venue_name','venue_location',
  'division_open','division_fees','sections','sponsors','faqs'
]));

create policy "Staff can read all site settings" on public.site_settings
for select to authenticated
using (public.is_staff(auth.uid()));
