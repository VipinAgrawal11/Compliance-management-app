-- =============================================================================
--  Compliance & Engagement Management — Row Level Security
--  Run AFTER schema.sql.
--
--  Access model:
--    partner   -> full visibility, full control, settings & templates & users
--    employee  -> only records assigned to them; may update work status / notes
-- =============================================================================

-- -----------------------------------------------------------------------------
--  Helper functions (SECURITY DEFINER avoids RLS recursion on public.users).
-- -----------------------------------------------------------------------------
create or replace function public.is_partner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'partner' from public.users where id = auth.uid()), false);
$$;

-- Does the current employee have an assignment for this reference?
create or replace function public.assigned_to_me(p_type assignment_ref, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assignments
    where reference_type = p_type and reference_id = p_id and employee_id = auth.uid()
  );
$$;

-- Can the current user see this client? (partner = all; employee = has any
-- assignment or engagement tied to the client)
create or replace function public.can_see_client(p_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_partner()
    or exists (select 1 from public.audit_engagements e
                where e.client_id = p_client and e.assigned_employee = auth.uid())
    or exists (select 1 from public.assignments a
                join public.compliances c on c.id = a.reference_id and a.reference_type = 'compliance'
               where c.client_id = p_client and a.employee_id = auth.uid())
    or exists (select 1 from public.assignments a
                join public.audit_engagements e on e.id = a.reference_id and a.reference_type = 'engagement'
               where e.client_id = p_client and a.employee_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
--  Enable RLS everywhere.
-- -----------------------------------------------------------------------------
alter table public.users                     enable row level security;
alter table public.clients                   enable row level security;
alter table public.compliances               enable row level security;
alter table public.audit_engagements         enable row level security;
alter table public.assignments               enable row level security;
alter table public.documents                 enable row level security;
alter table public.checklist_templates       enable row level security;
alter table public.checklist_items           enable row level security;
alter table public.audit_checklist_progress  enable row level security;
alter table public.communication_logs        enable row level security;
alter table public.notifications             enable row level security;
alter table public.app_settings              enable row level security;

-- =============================================================================
--  users  (directory readable by all staff; partner manages accounts)
-- =============================================================================
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated using (true);

drop policy if exists users_update on public.users;
create policy users_update on public.users for update to authenticated
  using (id = auth.uid() or public.is_partner())
  with check (id = auth.uid() or public.is_partner());

drop policy if exists users_insert on public.users;
create policy users_insert on public.users for insert to authenticated
  with check (public.is_partner());

-- =============================================================================
--  clients
-- =============================================================================
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated
  using (public.can_see_client(id));

drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients for all to authenticated
  using (public.is_partner()) with check (public.is_partner());

-- =============================================================================
--  compliances
-- =============================================================================
drop policy if exists compliances_select on public.compliances;
create policy compliances_select on public.compliances for select to authenticated
  using (public.is_partner() or public.assigned_to_me('compliance', id));

drop policy if exists compliances_insert on public.compliances;
create policy compliances_insert on public.compliances for insert to authenticated
  with check (public.is_partner());

drop policy if exists compliances_update on public.compliances;
create policy compliances_update on public.compliances for update to authenticated
  using (public.is_partner() or public.assigned_to_me('compliance', id))
  with check (public.is_partner() or public.assigned_to_me('compliance', id));

drop policy if exists compliances_delete on public.compliances;
create policy compliances_delete on public.compliances for delete to authenticated
  using (public.is_partner());

-- =============================================================================
--  audit_engagements
-- =============================================================================
drop policy if exists eng_select on public.audit_engagements;
create policy eng_select on public.audit_engagements for select to authenticated
  using (public.is_partner() or assigned_employee = auth.uid()
         or public.assigned_to_me('engagement', id));

drop policy if exists eng_insert on public.audit_engagements;
create policy eng_insert on public.audit_engagements for insert to authenticated
  with check (public.is_partner());

drop policy if exists eng_update on public.audit_engagements;
create policy eng_update on public.audit_engagements for update to authenticated
  using (public.is_partner() or assigned_employee = auth.uid()
         or public.assigned_to_me('engagement', id))
  with check (public.is_partner() or assigned_employee = auth.uid()
              or public.assigned_to_me('engagement', id));

drop policy if exists eng_delete on public.audit_engagements;
create policy eng_delete on public.audit_engagements for delete to authenticated
  using (public.is_partner());

-- =============================================================================
--  assignments  (employee sees & updates own row; partner manages all)
-- =============================================================================
drop policy if exists assign_select on public.assignments;
create policy assign_select on public.assignments for select to authenticated
  using (public.is_partner() or employee_id = auth.uid());

drop policy if exists assign_insert on public.assignments;
create policy assign_insert on public.assignments for insert to authenticated
  with check (public.is_partner());

drop policy if exists assign_update on public.assignments;
create policy assign_update on public.assignments for update to authenticated
  using (public.is_partner() or employee_id = auth.uid())
  with check (public.is_partner() or employee_id = auth.uid());

drop policy if exists assign_delete on public.assignments;
create policy assign_delete on public.assignments for delete to authenticated
  using (public.is_partner());

-- =============================================================================
--  documents  (scoped to visible client)
-- =============================================================================
drop policy if exists docs_select on public.documents;
create policy docs_select on public.documents for select to authenticated
  using (public.can_see_client(client_id));

drop policy if exists docs_insert on public.documents;
create policy docs_insert on public.documents for insert to authenticated
  with check (public.is_partner() or public.can_see_client(client_id));

drop policy if exists docs_update on public.documents;
create policy docs_update on public.documents for update to authenticated
  using (public.is_partner() or public.can_see_client(client_id))
  with check (public.is_partner() or public.can_see_client(client_id));

drop policy if exists docs_delete on public.documents;
create policy docs_delete on public.documents for delete to authenticated
  using (public.is_partner());

-- =============================================================================
--  checklist templates & items  (partner manages; everyone reads)
-- =============================================================================
drop policy if exists tmpl_select on public.checklist_templates;
create policy tmpl_select on public.checklist_templates for select to authenticated using (true);
drop policy if exists tmpl_write on public.checklist_templates;
create policy tmpl_write on public.checklist_templates for all to authenticated
  using (public.is_partner()) with check (public.is_partner());

drop policy if exists items_select on public.checklist_items;
create policy items_select on public.checklist_items for select to authenticated using (true);
drop policy if exists items_write on public.checklist_items;
create policy items_write on public.checklist_items for all to authenticated
  using (public.is_partner()) with check (public.is_partner());

-- =============================================================================
--  audit_checklist_progress  (partner all; assigned employee updates own items)
-- =============================================================================
drop policy if exists progress_select on public.audit_checklist_progress;
create policy progress_select on public.audit_checklist_progress for select to authenticated
  using (public.is_partner() or assigned_employee = auth.uid()
         or exists (select 1 from public.audit_engagements e
                     where e.id = engagement_id and e.assigned_employee = auth.uid()));

drop policy if exists progress_insert on public.audit_checklist_progress;
create policy progress_insert on public.audit_checklist_progress for insert to authenticated
  with check (public.is_partner() or exists (
      select 1 from public.audit_engagements e
       where e.id = engagement_id and e.assigned_employee = auth.uid()));

drop policy if exists progress_update on public.audit_checklist_progress;
create policy progress_update on public.audit_checklist_progress for update to authenticated
  using (public.is_partner() or assigned_employee = auth.uid()
         or exists (select 1 from public.audit_engagements e
                     where e.id = engagement_id and e.assigned_employee = auth.uid()))
  with check (public.is_partner() or assigned_employee = auth.uid()
         or exists (select 1 from public.audit_engagements e
                     where e.id = engagement_id and e.assigned_employee = auth.uid()));

drop policy if exists progress_delete on public.audit_checklist_progress;
create policy progress_delete on public.audit_checklist_progress for delete to authenticated
  using (public.is_partner());

-- =============================================================================
--  communication_logs  (visible per client; staff may add notes)
-- =============================================================================
drop policy if exists comm_select on public.communication_logs;
create policy comm_select on public.communication_logs for select to authenticated
  using (public.can_see_client(client_id));

drop policy if exists comm_insert on public.communication_logs;
create policy comm_insert on public.communication_logs for insert to authenticated
  with check (public.can_see_client(client_id) and created_by = auth.uid());

drop policy if exists comm_update on public.communication_logs;
create policy comm_update on public.communication_logs for update to authenticated
  using (public.is_partner() or created_by = auth.uid())
  with check (public.is_partner() or created_by = auth.uid());

drop policy if exists comm_delete on public.communication_logs;
create policy comm_delete on public.communication_logs for delete to authenticated
  using (public.is_partner() or created_by = auth.uid());

-- =============================================================================
--  notifications  (each user manages only their own)
-- =============================================================================
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_delete on public.notifications;
create policy notif_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());
-- rows created by SECURITY DEFINER triggers/functions — no client INSERT policy.

-- =============================================================================
--  app_settings  (everyone reads; only partners write)
-- =============================================================================
drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings for select to authenticated using (true);
drop policy if exists settings_update on public.app_settings;
create policy settings_update on public.app_settings for update to authenticated
  using (public.is_partner()) with check (public.is_partner());
