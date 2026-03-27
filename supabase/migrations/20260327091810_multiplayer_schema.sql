create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_player_id uuid null,
  board_size int not null check (board_size in (3, 5, 7)),
  lines_to_win int not null check (lines_to_win > 0),
  winner_room_player_id uuid null,
  winner_declared_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null,
  join_token text not null unique,
  lines int not null default 0,
  last_modified_by uuid null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.player_boards (
  id uuid primary key default gen_random_uuid(),
  room_player_id uuid not null references public.room_players(id) on delete cascade,
  board_size int not null check (board_size in (3, 5, 7)),
  created_at timestamptz not null default now()
);

create table if not exists public.board_cells (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.player_boards(id) on delete cascade,
  label text not null,
  position int not null,
  marked boolean not null default false,
  last_modified_by uuid null references public.room_players(id),
  updated_at timestamptz not null default now(),
  unique (board_id, position)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rooms_winner_fk'
  ) then
    alter table public.rooms
      add constraint rooms_winner_fk
      foreign key (winner_room_player_id)
      references public.room_players(id)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'room_players_last_modified_fk'
  ) then
    alter table public.room_players
      add constraint room_players_last_modified_fk
      foreign key (last_modified_by)
      references public.room_players(id)
      on delete set null;
  end if;
end
$$;

create or replace function public.current_player_id()
returns uuid
language sql
stable
as $$
  select rp.id
  from public.room_players rp
  where rp.join_token = coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'player_token'),
    ''
  )
  limit 1
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_room_players_touch_updated_at on public.room_players;
create trigger trg_room_players_touch_updated_at
before update on public.room_players
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_board_cells_touch_updated_at on public.board_cells;
create trigger trg_board_cells_touch_updated_at
before update on public.board_cells
for each row
execute function public.touch_updated_at();

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.player_boards enable row level security;
alter table public.board_cells enable row level security;

drop policy if exists rooms_select_same_room on public.rooms;
create policy rooms_select_same_room
on public.rooms
for select
using (
  exists (
    select 1
    from public.room_players me
    where me.room_id = rooms.id
      and me.id = public.current_player_id()
  )
);

drop policy if exists rooms_update_host_only on public.rooms;
create policy rooms_update_host_only
on public.rooms
for update
using (host_player_id = public.current_player_id())
with check (host_player_id = public.current_player_id());

drop policy if exists room_players_select_same_room on public.room_players;
create policy room_players_select_same_room
on public.room_players
for select
using (
  exists (
    select 1
    from public.room_players me
    where me.room_id = room_players.room_id
      and me.id = public.current_player_id()
  )
);

drop policy if exists room_players_update_self_only on public.room_players;
create policy room_players_update_self_only
on public.room_players
for update
using (id = public.current_player_id())
with check (
  id = public.current_player_id()
  and (last_modified_by is null or last_modified_by = public.current_player_id())
);

drop policy if exists player_boards_select_self_only on public.player_boards;
create policy player_boards_select_self_only
on public.player_boards
for select
using (room_player_id = public.current_player_id());

drop policy if exists player_boards_update_self_only on public.player_boards;
create policy player_boards_update_self_only
on public.player_boards
for update
using (room_player_id = public.current_player_id())
with check (room_player_id = public.current_player_id());

drop policy if exists board_cells_select_self_only on public.board_cells;
create policy board_cells_select_self_only
on public.board_cells
for select
using (
  exists (
    select 1
    from public.player_boards pb
    where pb.id = board_cells.board_id
      and pb.room_player_id = public.current_player_id()
  )
);

drop policy if exists board_cells_update_self_only on public.board_cells;
create policy board_cells_update_self_only
on public.board_cells
for update
using (
  exists (
    select 1
    from public.player_boards pb
    where pb.id = board_cells.board_id
      and pb.room_player_id = public.current_player_id()
  )
)
with check (
  exists (
    select 1
    from public.player_boards pb
    where pb.id = board_cells.board_id
      and pb.room_player_id = public.current_player_id()
  )
  and (last_modified_by is null or last_modified_by = public.current_player_id())
);

alter table public.rooms replica identity full;
alter table public.room_players replica identity full;
alter table public.board_cells replica identity full;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.board_cells;

create or replace function public.broadcast_player_joined()
returns trigger
language plpgsql
security definer
as $$
begin
  perform realtime.broadcast_changes(
    format('room:%s', new.room_id),
    'player_joined',
    tg_op,
    tg_table_name,
    tg_table_schema,
    jsonb_build_object(
      'room_id', new.room_id,
      'room_player_id', new.id,
      'display_name', new.display_name,
      'lines', new.lines,
      'created_at', new.created_at
    ),
    null
  );

  return new;
end;
$$;

create or replace function public.broadcast_cell_toggled()
returns trigger
language plpgsql
security definer
as $$
declare
  v_room_player_id uuid;
  v_room_id uuid;
begin
  select pb.room_player_id, rp.room_id
    into v_room_player_id, v_room_id
  from public.player_boards pb
  join public.room_players rp on rp.id = pb.room_player_id
  where pb.id = new.board_id;

  if old.marked is distinct from new.marked then
    perform realtime.broadcast_changes(
      format('room:%s', v_room_id),
      'cell_toggled',
      tg_op,
      tg_table_name,
      tg_table_schema,
      jsonb_build_object(
        'room_id', v_room_id,
        'room_player_id', v_room_player_id,
        'actor_room_player_id', new.last_modified_by,
        'board_id', new.board_id,
        'cell_id', new.id,
        'marked', new.marked,
        'updated_at', new.updated_at
      ),
      jsonb_build_object(
        'marked', old.marked
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.broadcast_lines_updated()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.lines is distinct from new.lines then
    perform realtime.broadcast_changes(
      format('room:%s', new.room_id),
      'lines_updated',
      tg_op,
      tg_table_name,
      tg_table_schema,
      jsonb_build_object(
        'room_id', new.room_id,
        'room_player_id', new.id,
        'actor_room_player_id', new.last_modified_by,
        'lines', new.lines,
        'updated_at', new.updated_at
      ),
      jsonb_build_object(
        'lines', old.lines
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.broadcast_winner_declared()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.winner_room_player_id is distinct from new.winner_room_player_id then
    perform realtime.broadcast_changes(
      format('room:%s', new.id),
      'winner_declared',
      tg_op,
      tg_table_name,
      tg_table_schema,
      jsonb_build_object(
        'room_id', new.id,
        'winner_room_player_id', new.winner_room_player_id,
        'winner_declared_at', new.winner_declared_at
      ),
      jsonb_build_object(
        'winner_room_player_id', old.winner_room_player_id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_room_players_player_joined on public.room_players;
create trigger trg_room_players_player_joined
after insert on public.room_players
for each row
execute function public.broadcast_player_joined();

drop trigger if exists trg_board_cells_cell_toggled on public.board_cells;
create trigger trg_board_cells_cell_toggled
after update on public.board_cells
for each row
execute function public.broadcast_cell_toggled();

drop trigger if exists trg_room_players_lines_updated on public.room_players;
create trigger trg_room_players_lines_updated
after update on public.room_players
for each row
execute function public.broadcast_lines_updated();

drop trigger if exists trg_rooms_winner_declared on public.rooms;
create trigger trg_rooms_winner_declared
after update on public.rooms
for each row
execute function public.broadcast_winner_declared();
