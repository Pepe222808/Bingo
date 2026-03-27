alter table public.rooms
add column if not exists stop_on_first_winner boolean not null default false;
