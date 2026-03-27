create or replace function public.broadcast_player_joined()
returns trigger
language plpgsql
security definer
as $$
begin
  perform realtime.broadcast_changes(
    format('room:%s', new.room_id)::text,
    'player_joined'::text,
    tg_op::text,
    tg_table_name::text,
    tg_table_schema::text,
    jsonb_build_object(
      'room_id', new.room_id,
      'room_player_id', new.id,
      'display_name', new.display_name,
      'lines', new.lines,
      'created_at', new.created_at
    ),
    null::jsonb
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
      format('room:%s', v_room_id)::text,
      'cell_toggled'::text,
      tg_op::text,
      tg_table_name::text,
      tg_table_schema::text,
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
      format('room:%s', new.room_id)::text,
      'lines_updated'::text,
      tg_op::text,
      tg_table_name::text,
      tg_table_schema::text,
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
      format('room:%s', new.id)::text,
      'winner_declared'::text,
      tg_op::text,
      tg_table_name::text,
      tg_table_schema::text,
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
