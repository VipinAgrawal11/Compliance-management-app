-- =============================================================================
--  Audit Firm Compliance & Engagement Management System — Database Schema
--  Run order:  1) schema.sql   2) policies.sql   3) seed (scripts/seed.mjs)
--  Target: Supabase (PostgreSQL 15+)
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- =============================================================================
--  ENUM TYPES
-- =============================================================================
do $$ begin create type user_role          as enum ('partner', 'employee'); exception when duplicate_object then null; end $$;
do $$ begin create type entity_type        as enum ('Proprietorship', 'Partnership', 'Pvt Ltd', 'Public Ltd', 'NGO'); exception when duplicate_object then null; end $$;
do $$ begin create type industry_type       as enum ('Manufacturing', 'Trading', 'Service'); exception when duplicate_object then null; end $$;
do $$ begin create type tax_type            as enum ('PAN', 'VAT'); exception when duplicate_object then null; end $$;
do $$ begin create type compliance_category as enum ('TAX', 'CORPORATE', 'AUDIT', 'OTHER'); exception when duplicate_object then null; end $$;
do $$ begin create type compliance_status   as enum ('Pending', 'In Progress', 'Completed'); exception when duplicate_object then null; end $$;
do $$ begin create type audit_type          as enum ('Statutory Audit', 'Internal Audit', 'Other Audit'); exception when duplicate_object then null; end $$;
do $$ begin create type audit_stage         as enum ('Not Started', 'Planning', 'Documents Requested', 'Documents Received', 'Field Work', 'Review', 'Partner Approval', 'Report Issued', 'Closed'); exception when duplicate_object then null; end $$;
do $$ begin create type document_status     as enum ('Requested', 'Received', 'Pending', 'Not Applicable'); exception when duplicate_object then null; end $$;
do $$ begin create type assignment_status   as enum ('Pending', 'Completed'); exception when duplicate_object then null; end $$;
do $$ begin create type assignment_ref      as enum ('compliance', 'engagement'); exception when duplicate_object then null; end $$;
do $$ begin create type checklist_status    as enum ('Pending', 'Completed', 'Reviewed'); exception when duplicate_object then null; end $$;
do $$ begin create type communication_type  as enum ('Meeting', 'Call', 'Email', 'Other'); exception when duplicate_object then null; end $$;

-- =============================================================================
--  TABLE: users  (profile mirror of auth.users)
-- =============================================================================
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null default '',
  email       text        not null,
  role        user_role   not null default 'employee',
  designation text        not null default 'Audit Associate',
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.users is 'Firm staff. One row per auth user, created via trigger on signup.';

-- =============================================================================
--  TABLE: clients
-- =============================================================================
create table if not exists public.clients (
  id                   uuid primary key default gen_random_uuid(),
  client_name          text        not null,
  entity_type          entity_type not null default 'Pvt Ltd',
  industry             industry_type,
  registration_details text        not null default '',
  tax_type             tax_type,
  tax_number           text        not null default '',
  location             text        not null default '',
  contact_person       text        not null default '',
  contact_number       text        not null default '',
  services             text[]      not null default '{}',  -- Audit, Accounting, Internal Audit, Advisory, DDA, Others
  other_service        text        not null default '',
  history_notes        text        not null default '',
  created_by           uuid        references public.users (id) on delete set null,
  created_at           timestamptz not null default now()
);
create index if not exists idx_clients_name on public.clients (client_name);

-- =============================================================================
--  TABLE: compliances
-- =============================================================================
create table if not exists public.compliances (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid                not null references public.clients (id) on delete cascade,
  category    compliance_category not null default 'TAX',
  subcategory text                not null,
  due_date    date,
  status      compliance_status   not null default 'Pending',
  remarks     text                not null default '',
  created_by  uuid                references public.users (id) on delete set null,
  created_at  timestamptz         not null default now(),
  updated_at  timestamptz         not null default now()
);
create index if not exists idx_compliances_client on public.compliances (client_id);
create index if not exists idx_compliances_due    on public.compliances (due_date);
create index if not exists idx_compliances_status on public.compliances (status);

-- =============================================================================
--  TABLE: audit_engagements
-- =============================================================================
create table if not exists public.audit_engagements (
  id                uuid        primary key default gen_random_uuid(),
  client_id         uuid        not null references public.clients (id) on delete cascade,
  audit_type        audit_type  not null default 'Statutory Audit',
  stage             audit_stage not null default 'Not Started',
  assigned_employee uuid        references public.users (id) on delete set null,
  start_date        date,
  deadline          date,
  delay_reason      text        not null default '',
  created_by        uuid        references public.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_eng_client   on public.audit_engagements (client_id);
create index if not exists idx_eng_employee on public.audit_engagements (assigned_employee);
create index if not exists idx_eng_deadline on public.audit_engagements (deadline);

-- =============================================================================
--  TABLE: assignments  (many employees per work item; each has own status)
-- =============================================================================
create table if not exists public.assignments (
  id             uuid primary key default gen_random_uuid(),
  reference_type assignment_ref    not null,        -- 'compliance' | 'engagement'
  reference_id   uuid              not null,         -- compliances.id or audit_engagements.id
  employee_id    uuid              not null references public.users (id) on delete cascade,
  status         assignment_status not null default 'Pending',
  completed_date date,
  created_at     timestamptz       not null default now(),
  unique (reference_type, reference_id, employee_id)
);
create index if not exists idx_assign_ref      on public.assignments (reference_type, reference_id);
create index if not exists idx_assign_employee on public.assignments (employee_id, status);

-- =============================================================================
--  TABLE: documents  (request tracker — no file storage, tracking only)
-- =============================================================================
create table if not exists public.documents (
  id             uuid            primary key default gen_random_uuid(),
  client_id      uuid            not null references public.clients (id) on delete cascade,
  audit_id       uuid            references public.audit_engagements (id) on delete set null,
  document_name  text            not null,
  requested_date date,
  deadline       date,
  status         document_status not null default 'Requested',
  remarks        text            not null default '',
  created_at     timestamptz     not null default now()
);
create index if not exists idx_docs_client on public.documents (client_id);
create index if not exists idx_docs_audit  on public.documents (audit_id);

-- =============================================================================
--  AUDIT CHECKLISTS
-- =============================================================================
create table if not exists public.checklist_templates (
  id         uuid       primary key default gen_random_uuid(),
  name       text       not null,
  audit_type audit_type not null default 'Statutory Audit',
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id          uuid    primary key default gen_random_uuid(),
  template_id uuid    not null references public.checklist_templates (id) on delete cascade,
  item_name   text    not null,
  sort_order  int     not null default 0
);
create index if not exists idx_items_template on public.checklist_items (template_id, sort_order);

-- Per-engagement progress against a checklist item.
create table if not exists public.audit_checklist_progress (
  id                uuid             primary key default gen_random_uuid(),
  engagement_id     uuid             not null references public.audit_engagements (id) on delete cascade,
  item_id           uuid             references public.checklist_items (id) on delete set null,
  item_name         text             not null,        -- denormalised so progress survives template edits
  assigned_employee uuid             references public.users (id) on delete set null,
  status            checklist_status not null default 'Pending',
  review_comment    text             not null default '',
  created_at        timestamptz      not null default now(),
  updated_at        timestamptz      not null default now()
);
create index if not exists idx_progress_eng on public.audit_checklist_progress (engagement_id);

-- =============================================================================
--  TABLE: communication_logs
-- =============================================================================
create table if not exists public.communication_logs (
  id                 uuid               primary key default gen_random_uuid(),
  client_id          uuid               not null references public.clients (id) on delete cascade,
  date               date               not null default current_date,
  type               communication_type not null default 'Meeting',
  discussion_notes   text               not null default '',
  decision_taken     text               not null default '',
  next_action        text               not null default '',
  responsible_person uuid               references public.users (id) on delete set null,
  created_by         uuid               references public.users (id) on delete set null,
  created_at         timestamptz        not null default now()
);
create index if not exists idx_comm_client on public.communication_logs (client_id, date desc);

-- =============================================================================
--  TABLE: notifications
-- =============================================================================
create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users (id) on delete cascade,
  message     text        not null,
  link        text,                       -- e.g. '/calendar', '/audits'
  category    text        not null default 'info',  -- info | reminder | overdue | escalation
  read_status boolean     not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications (user_id, read_status, created_at desc);

-- =============================================================================
--  TABLE: app_settings  (single-row firm configuration; partner editable)
-- =============================================================================
create table if not exists public.app_settings (
  id              int         primary key default 1 check (id = 1),
  firm_name       text        not null default 'Audit & Co. Chartered Accountants',
  reminder_days   int[]       not null default '{30,15,7,1}',
  designations    text[]      not null default '{Partner,Audit Manager,Senior Associate,Audit Associate,Article Assistant}',
  notify_overdue  boolean     not null default true,
  updated_at      timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- =============================================================================
--  GENERIC: keep updated_at fresh
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_compliances_updated on public.compliances;
create trigger trg_compliances_updated before update on public.compliances
  for each row execute function public.set_updated_at();

drop trigger if exists trg_eng_updated on public.audit_engagements;
create trigger trg_eng_updated before update on public.audit_engagements
  for each row execute function public.set_updated_at();

drop trigger if exists trg_progress_updated on public.audit_checklist_progress;
create trigger trg_progress_updated before update on public.audit_checklist_progress
  for each row execute function public.set_updated_at();

-- =============================================================================
--  Mirror new auth users into public.users (name/role/designation from metadata)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, role, designation)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'employee'),
    coalesce(new.raw_user_meta_data ->> 'designation', 'Audit Associate')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
--  ASSIGNMENT: stamp completion date automatically
-- =============================================================================
create or replace function public.handle_assignment_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Completed' and old.status <> 'Completed' then
    new.completed_date := coalesce(new.completed_date, current_date);
  elsif new.status <> 'Completed' then
    new.completed_date := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_assignment_stamp on public.assignments;
create trigger trg_assignment_stamp before update on public.assignments
  for each row execute function public.handle_assignment_change();

-- Roll-up: overall item is Completed only when ALL assigned employees finish.
create or replace function public.rollup_assignment_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ref_type assignment_ref := coalesce(new.reference_type, old.reference_type);
  ref_id   uuid           := coalesce(new.reference_id, old.reference_id);
  pending_count int;
begin
  select count(*) into pending_count
    from public.assignments
   where reference_type = ref_type and reference_id = ref_id and status <> 'Completed';

  if ref_type = 'compliance' then
    if pending_count = 0 then
      update public.compliances set status = 'Completed' where id = ref_id and status <> 'Completed';
    end if;
  elsif ref_type = 'engagement' then
    if pending_count = 0 then
      update public.audit_engagements set stage = 'Report Issued'
        where id = ref_id and stage not in ('Report Issued', 'Closed');
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_assignment_rollup on public.assignments;
create trigger trg_assignment_rollup
  after insert or update or delete on public.assignments
  for each row execute function public.rollup_assignment_status();

-- =============================================================================
--  NOTIFY on new assignment (employee)
-- =============================================================================
create or replace function public.notify_new_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  label text;
begin
  if new.reference_type = 'compliance' then
    select c.subcategory || ' — ' || cl.client_name into label
      from public.compliances c join public.clients cl on cl.id = c.client_id
     where c.id = new.reference_id;
    insert into public.notifications (user_id, message, link, category)
    values (new.employee_id, 'New compliance assigned: ' || coalesce(label, ''), '/calendar', 'info');
  else
    select e.audit_type || ' — ' || cl.client_name into label
      from public.audit_engagements e join public.clients cl on cl.id = e.client_id
     where e.id = new.reference_id;
    insert into public.notifications (user_id, message, link, category)
    values (new.employee_id, 'New engagement assigned: ' || coalesce(label, ''), '/audits', 'info');
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_assignment on public.assignments;
create trigger trg_notify_assignment after insert on public.assignments
  for each row execute function public.notify_new_assignment();

-- =============================================================================
--  REMINDER GENERATOR
--  Inserts reminder/overdue notifications for compliances based on
--  app_settings.reminder_days. Idempotent per (recipient, message) per day.
--  Schedule daily with pg_cron (see bottom) or call from the app on partner login.
-- =============================================================================
create or replace function public.generate_due_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare
  days int[];
  do_overdue boolean;
  d int;
  rec record;
  partner_id uuid;
  msg text;
begin
  select reminder_days, notify_overdue into days, do_overdue from public.app_settings where id = 1;

  -- ---- Upcoming compliance reminders -------------------------------------
  foreach d in array days loop
    for rec in
      select c.id, c.subcategory, c.due_date, cl.client_name, a.employee_id
        from public.compliances c
        join public.clients cl on cl.id = c.client_id
        left join public.assignments a on a.reference_type = 'compliance' and a.reference_id = c.id
       where c.status <> 'Completed' and c.due_date = current_date + d
    loop
      msg := format('Reminder: %s for %s due in %s day(s) on %s',
                    rec.subcategory, rec.client_name, d, to_char(rec.due_date, 'DD Mon YYYY'));
      if rec.employee_id is not null then
        insert into public.notifications (user_id, message, link, category)
        select rec.employee_id, msg, '/calendar', 'reminder'
        where not exists (
          select 1 from public.notifications n
          where n.user_id = rec.employee_id and n.message = msg
            and n.created_at::date = current_date);
      end if;
    end loop;
  end loop;

  -- ---- Overdue + escalation to partners ----------------------------------
  if do_overdue then
    for rec in
      select c.id, c.subcategory, c.due_date, cl.client_name, a.employee_id
        from public.compliances c
        join public.clients cl on cl.id = c.client_id
        left join public.assignments a on a.reference_type = 'compliance' and a.reference_id = c.id
       where c.status <> 'Completed' and c.due_date < current_date
    loop
      msg := format('OVERDUE: %s for %s was due %s', rec.subcategory, rec.client_name,
                    to_char(rec.due_date, 'DD Mon YYYY'));
      if rec.employee_id is not null then
        insert into public.notifications (user_id, message, link, category)
        select rec.employee_id, msg, '/calendar', 'overdue'
        where not exists (select 1 from public.notifications n
          where n.user_id = rec.employee_id and n.message = msg and n.created_at::date = current_date);
      end if;
      for partner_id in select id from public.users where role = 'partner' and active loop
        insert into public.notifications (user_id, message, link, category)
        select partner_id, 'Escalation — ' || msg, '/', 'escalation'
        where not exists (select 1 from public.notifications n
          where n.user_id = partner_id and n.message = 'Escalation — ' || msg
            and n.created_at::date = current_date);
      end loop;
    end loop;
  end if;
end $$;

-- =============================================================================
--  REALTIME publication
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'users','clients','compliances','audit_engagements','assignments',
    'documents','checklist_templates','checklist_items','audit_checklist_progress',
    'communication_logs','notifications','app_settings'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- =============================================================================
--  OPTIONAL: schedule daily reminders with pg_cron (enable the extension first
--  in Supabase: Database -> Extensions -> pg_cron). Then run:
--
--    select cron.schedule('daily-reminders', '0 3 * * *',
--                         $$select public.generate_due_reminders()$$);
--
--  Until then, the app calls generate_due_reminders() opportunistically on a
--  partner login so reminders still get generated on free tier without cron.
-- =============================================================================
