create extension if not exists pg_cron;

create or replace function public.cleanup_expired_rooms()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.rooms
  where created_at < now() - interval '48 hours';
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-expired-rooms-48h') then
    perform cron.unschedule('cleanup-expired-rooms-48h');
  end if;

  perform cron.schedule(
    'cleanup-expired-rooms-48h',
    '0 * * * *',
    $cron$select public.cleanup_expired_rooms();$cron$
  );
end
$$;
