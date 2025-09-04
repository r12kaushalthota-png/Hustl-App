/*
  # Fix accept_task function conflict

  This migration cleanly removes any existing variants of the accept_task function
  and recreates it with the correct signature and atomic behavior.

  1. Function Cleanup
    - Drop all possible existing signatures of accept_task function
    - Ensures no conflicts with previous versions

  2. Function Recreation
    - Creates accept_task(p_task_id uuid, p_user_id uuid) that returns tasks row
    - Performs atomic OPEN→ACCEPTED update with single winner guarantee
    - Proper error handling for already accepted tasks

  3. Security
    - Grant execute permission to authenticated users
    - Uses security definer for elevated permissions
*/

begin;

-- Drop all possible existing signatures of accept_task function
drop function if exists public.accept_task(uuid);
drop function if exists public.accept_task(uuid, uuid);
drop function if exists public.accept_task(uuid, uuid, uuid);

-- Create the correct accept_task function
create or replace function public.accept_task(p_task_id uuid, p_user_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tasks;
begin
  -- Atomic update: only one user can win the race
  update public.tasks
     set status = 'accepted'::task_status,
         accepted_by = p_user_id,
         accepted_at = now()
   where id = p_task_id
     and status = 'open'::task_status
  returning * into t;

  -- If no row was updated, task was already accepted
  if t.id is null then
    raise exception 'TASK_ALREADY_ACCEPTED';
  end if;

  return t;
end$$;

-- Grant execute permission to authenticated users
grant execute on function public.accept_task(uuid, uuid) to authenticated;

commit;