-- ============================================================================
-- Fishbowl — session ownership hardening (security review follow-up).
-- Stops trusting client-supplied creator_person_id: ownership is now derived
-- server-side from the email inside a SECURITY DEFINER RPC, the anon INSERT
-- policy forbids setting creator_person_id directly, and fishbowl_identify is no
-- longer an anon-callable email->person_id oracle.
-- Apply order (to avoid breaking the live create flow mid-deploy):
--   PART 1 (additive RPC) -> ship the frontend that calls it -> PART 2 (lockdown).
-- Applied via migrations "fishbowl_create_session_rpc" and "fishbowl_session_ownership_lockdown".
-- ============================================================================

-- ── PART 1 — server-side session creation (additive) ──
create or replace function public.fishbowl_create_session(
  p_name text,
  p_slug text,
  p_context text default null,
  p_email text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare pid uuid;
begin
  if p_email is not null and trim(p_email) <> '' then
    pid := public.fishbowl_identify(p_email, p_name);
  end if;
  insert into public.fishbowl_sessions (creator_name, slug, response_count, context, creator_person_id)
  values (p_name, p_slug, 0, nullif(trim(coalesce(p_context, '')), ''), pid);
  return p_slug;
end;
$$;
revoke all on function public.fishbowl_create_session(text, text, text, text) from public;
grant execute on function public.fishbowl_create_session(text, text, text, text) to anon, authenticated;

-- ── PART 2 — lockdown (apply AFTER the frontend using the RPC is live) ──
-- Anon may still insert a session, but can no longer assert ownership; only the
-- SECURITY DEFINER RPC above and the service-role magic-link claim set it.
drop policy if exists "fishbowl_sessions_insert_anyone" on public.fishbowl_sessions;
create policy "fishbowl_sessions_insert_unowned"
  on public.fishbowl_sessions for insert to anon, authenticated
  with check (creator_person_id is null);

-- Close the email->person_id oracle. SECURITY DEFINER callers (fishbowl_create_session,
-- fishbowl_submit_response) still reach it as the function owner; service-role too.
revoke execute on function public.fishbowl_identify(text, text) from anon, authenticated;
