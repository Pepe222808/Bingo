create or replace function public.broadcast_player_joined()
returns trigger
language plpgsql
security definer
as $$
begin
  return new;
end;
$$;

create or replace function public.broadcast_cell_toggled()
returns trigger
language plpgsql
security definer
as $$
begin
  return new;
end;
$$;

create or replace function public.broadcast_lines_updated()
returns trigger
language plpgsql
security definer
as $$
begin
  return new;
end;
$$;

create or replace function public.broadcast_winner_declared()
returns trigger
language plpgsql
security definer
as $$
begin
  return new;
end;
$$;
