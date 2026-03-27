alter table public.rooms
add column if not exists room_code text;

update public.rooms
set room_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6))
where room_code is null;

alter table public.rooms
alter column room_code set not null;

create unique index if not exists rooms_room_code_key
on public.rooms (room_code);
