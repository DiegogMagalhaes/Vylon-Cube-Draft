-- Cole no Supabase > SQL Editor > Run

create table cubes(
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  cards jsonb not null,            -- [{i:passcode, n:nome, r:raridade, x:1 se extra deck}]
  created_at timestamptz default now());

create table rooms(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host uuid not null default auth.uid() references auth.users on delete cascade,
  cube_id uuid references cubes on delete set null,
  cube_name text,
  settings jsonb not null,         -- {packs, size, rar:{raridade:qtd}}
  status text not null default 'lobby',  -- lobby | drafting | done
  state jsonb not null default '{}',
  created_at timestamptz default now());

create table room_players(
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  username text,
  seat int default 0,
  hand jsonb default '[]',
  picks jsonb default '[]',
  chosen int,
  created_at timestamptz default now(),
  unique(room_id,user_id));

create table drafts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  room_id uuid,
  cube_name text,
  settings jsonb,
  picks jsonb not null,
  created_at timestamptz default now(),
  unique(user_id,room_id));

alter table cubes enable row level security;
alter table rooms enable row level security;
alter table room_players enable row level security;
alter table drafts enable row level security;

create policy "cubes: dono" on cubes for all to authenticated
  using(owner=auth.uid()) with check(owner=auth.uid());

create policy "rooms: ler" on rooms for select to authenticated using(true);
create policy "rooms: criar" on rooms for insert to authenticated with check(host=auth.uid());
create policy "rooms: host edita" on rooms for update to authenticated using(host=auth.uid());
create policy "rooms: host apaga" on rooms for delete to authenticated using(host=auth.uid());

create policy "players: ler" on room_players for select to authenticated using(true);
create policy "players: entrar" on room_players for insert to authenticated
  with check(user_id=auth.uid() and exists(select 1 from rooms r where r.id=room_id and r.status='lobby'));
create policy "players: editar" on room_players for update to authenticated
  using(user_id=auth.uid() or exists(select 1 from rooms r where r.id=room_id and r.host=auth.uid()));
create policy "players: sair" on room_players for delete to authenticated
  using(user_id=auth.uid() or exists(select 1 from rooms r where r.id=room_id and r.host=auth.uid()));

create policy "drafts: dono" on drafts for all to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());

alter publication supabase_realtime add table rooms, room_players;
