-- Phase 6 connected football platform schema.
-- Create a migration with `supabase migration new phase6_connected_platform`,
-- then copy this reviewed SQL into the generated migration before applying it.

create table if not exists public.efu_profiles (
  id text primary key,
  owner_id uuid not null default (select auth.uid()) references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 3 and 24),
  region text not null default 'auto',
  rating integer not null default 1000 check (rating between 0 and 3000),
  division text not null default 'silver',
  fair_play integer not null default 100 check (fair_play between 0 and 100),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.efu_cloud_saves (
  player_id text primary key references public.efu_profiles(id) on delete cascade,
  owner_id uuid not null default (select auth.uid()) references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  checksum text not null,
  device_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.efu_ranked_entries (
  player_id text primary key references public.efu_profiles(id) on delete cascade,
  owner_id uuid not null default (select auth.uid()) references auth.users(id) on delete cascade,
  season_id text not null,
  display_name text not null,
  region text not null default 'auto',
  rating integer not null default 1000 check (rating between 0 and 3000),
  division text not null default 'silver',
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  fair_play integer not null default 100 check (fair_play between 0 and 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.efu_matchmaking_tickets (
  id text primary key,
  player_id text not null references public.efu_profiles(id) on delete cascade,
  owner_id uuid not null default (select auth.uid()) references auth.users(id) on delete cascade,
  mode text not null,
  region text not null,
  rating integer not null,
  fair_play integer not null check (fair_play between 0 and 100),
  latency_ceiling_ms integer not null check (latency_ceiling_ms between 20 and 400),
  skill_window integer not null check (skill_window between 25 and 600),
  party_size integer not null check (party_size between 1 and 5),
  status text not null default 'searching' check (status in ('searching','matched','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create table if not exists public.efu_match_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 4 and 8),
  host_player_id text not null references public.efu_profiles(id) on delete cascade,
  host_owner_id uuid not null default (select auth.uid()) references auth.users(id) on delete cascade,
  mode text not null,
  authority_region text not null,
  state text not null default 'lobby' check (state in ('lobby','ready-check','playing','completed','abandoned')),
  snapshot_revision bigint not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create table if not exists public.efu_match_participants (
  room_id uuid not null references public.efu_match_rooms(id) on delete cascade,
  player_id text not null references public.efu_profiles(id) on delete cascade,
  owner_id uuid not null default (select auth.uid()) references auth.users(id) on delete cascade,
  team text not null check (team in ('home','away')),
  ready boolean not null default false,
  connected boolean not null default true,
  latency_ms integer not null default 0 check (latency_ms between 0 and 1000),
  last_sequence bigint not null default -1,
  last_heartbeat_at timestamptz not null default now(),
  primary key(room_id, player_id)
);

create table if not exists public.efu_match_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.efu_match_rooms(id) on delete cascade,
  player_id text not null references public.efu_profiles(id) on delete cascade,
  owner_id uuid not null default (select auth.uid()) references auth.users(id) on delete cascade,
  sequence bigint not null,
  match_time_ms bigint not null check (match_time_ms >= 0),
  action text not null,
  previous_hash text not null,
  event_hash text not null,
  payload jsonb not null,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  accepted boolean not null default true,
  created_at timestamptz not null default now(),
  unique(room_id, player_id, sequence)
);

create table if not exists public.efu_player_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_owner_id uuid not null default (select auth.uid()) references auth.users(id) on delete cascade,
  reported_player_id text not null,
  room_id uuid references public.efu_match_rooms(id) on delete set null,
  category text not null,
  details text not null default '',
  evidence_event_ids bigint[] not null default '{}',
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists efu_profiles_owner_idx on public.efu_profiles(owner_id);
create index if not exists efu_cloud_saves_owner_idx on public.efu_cloud_saves(owner_id);
create index if not exists efu_ranked_rating_idx on public.efu_ranked_entries(season_id, rating desc);
create index if not exists efu_tickets_search_idx on public.efu_matchmaking_tickets(status, mode, region, created_at);
create index if not exists efu_participants_owner_idx on public.efu_match_participants(owner_id);
create index if not exists efu_events_room_idx on public.efu_match_events(room_id, sequence);
create index if not exists efu_reports_owner_idx on public.efu_player_reports(reporter_owner_id);

alter table public.efu_profiles enable row level security;
alter table public.efu_cloud_saves enable row level security;
alter table public.efu_ranked_entries enable row level security;
alter table public.efu_matchmaking_tickets enable row level security;
alter table public.efu_match_rooms enable row level security;
alter table public.efu_match_participants enable row level security;
alter table public.efu_match_events enable row level security;
alter table public.efu_player_reports enable row level security;

create policy "profile owner select" on public.efu_profiles for select to authenticated using ((select auth.uid()) = owner_id);
create policy "profile owner insert" on public.efu_profiles for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "profile owner update" on public.efu_profiles for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "cloud save owner select" on public.efu_cloud_saves for select to authenticated using ((select auth.uid()) = owner_id);
create policy "cloud save owner insert" on public.efu_cloud_saves for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "cloud save owner update" on public.efu_cloud_saves for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "ranked entries visible" on public.efu_ranked_entries for select to authenticated using (true);
create policy "ranked owner insert" on public.efu_ranked_entries for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "ranked owner update" on public.efu_ranked_entries for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "ticket owner select" on public.efu_matchmaking_tickets for select to authenticated using ((select auth.uid()) = owner_id);
create policy "ticket owner insert" on public.efu_matchmaking_tickets for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "ticket owner update" on public.efu_matchmaking_tickets for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "ticket owner delete" on public.efu_matchmaking_tickets for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "room host select" on public.efu_match_rooms for select to authenticated using ((select auth.uid()) = host_owner_id or exists (select 1 from public.efu_match_participants p where p.room_id = id and p.owner_id = (select auth.uid())));
create policy "room host insert" on public.efu_match_rooms for insert to authenticated with check ((select auth.uid()) = host_owner_id);
create policy "room host update" on public.efu_match_rooms for update to authenticated using ((select auth.uid()) = host_owner_id) with check ((select auth.uid()) = host_owner_id);

create policy "participant owner select" on public.efu_match_participants for select to authenticated using ((select auth.uid()) = owner_id);
create policy "participant owner insert" on public.efu_match_participants for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "participant owner update" on public.efu_match_participants for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "event owner select" on public.efu_match_events for select to authenticated using ((select auth.uid()) = owner_id);
create policy "event owner insert" on public.efu_match_events for insert to authenticated with check ((select auth.uid()) = owner_id);

create policy "report owner select" on public.efu_player_reports for select to authenticated using ((select auth.uid()) = reporter_owner_id);
create policy "report owner insert" on public.efu_player_reports for insert to authenticated with check ((select auth.uid()) = reporter_owner_id);

create or replace view public.efu_ranked_leaderboard
with (security_invoker = true)
as
select player_id, display_name, rating, division, wins, losses, fair_play, region
from public.efu_ranked_entries
order by rating desc;

create or replace function public.efu_room_heartbeat(p_room_id uuid, p_player_id text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.efu_match_participants
  set connected = true, last_heartbeat_at = now()
  where room_id = p_room_id
    and player_id = p_player_id
    and owner_id = (select auth.uid());
$$;

revoke all on function public.efu_room_heartbeat(uuid, text) from public;
grant execute on function public.efu_room_heartbeat(uuid, text) to authenticated;

grant select, insert, update on public.efu_profiles to authenticated;
grant select, insert, update on public.efu_cloud_saves to authenticated;
grant select, insert, update on public.efu_ranked_entries to authenticated;
grant select, insert, update, delete on public.efu_matchmaking_tickets to authenticated;
grant select, insert, update on public.efu_match_rooms to authenticated;
grant select, insert, update on public.efu_match_participants to authenticated;
grant select, insert on public.efu_match_events to authenticated;
grant select, insert on public.efu_player_reports to authenticated;
grant select on public.efu_ranked_leaderboard to authenticated;
