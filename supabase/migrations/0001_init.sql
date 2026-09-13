-- LawnFlow schema for Supabase, generated from the Base44 entity
-- definitions in base44/entities/*.jsonc.
--
-- Every business table shares the Base44 record shape:
--   id            text primary key   (kept as text so imported Base44 ids,
--                                      which look like Mongo ObjectIds, still
--                                      match every foreign-key-by-string
--                                      reference in the exported data)
--   created_date  timestamptz
--   updated_date  timestamptz (auto-touched by set_updated_date() below)
--   created_by    text (creator's email, Base44 convention)
--
-- Enum-like fields (status, role, category, ...) are left as plain `text`
-- rather than CHECK-constrained: the app is the source of truth for valid
-- values today, and a stray legacy value from the export should not block
-- the data import.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------

create or replace function public.set_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- profiles (Base44 "User" entity — role only; identity lives in auth.users)
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_date();

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "profiles_delete_own_or_admin" on public.profiles
  for delete using (id = auth.uid() or public.is_admin());
-- Rows are created by the handle_new_user trigger below, not directly by clients.

-- The FIRST person to sign up becomes admin; everyone after is a regular user.
-- Adjust manually afterwards in the Supabase dashboard/SQL editor if needed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case when exists (select 1 from public.profiles) then 'user' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- generic "business table" scaffolding
-- ---------------------------------------------------------------------
-- (Written out explicitly per table below — Postgres has no template tables —
-- but every CREATE TABLE follows the same id/created_date/updated_date/created_by shape.)

create table public.customers (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  name text not null,
  phone text,
  address text,
  notes text,
  service_line text default 'mowing',
  set_price numeric default 0,
  yard_size_sqft numeric default 0,
  mulch_type text default 'mulched',
  service_details text,
  lights_scope text,
  lights_colors text,
  leaf_volume text default 'moderate',
  disposal_preference text default 'bagged',
  client_quality numeric default 3,
  is_recurring boolean default false,
  recurring_rule text default 'by_request',
  preferred_contact text default 'text',
  active boolean default true
);

create table public.employees (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  name text not null,
  phone text,
  role text default 'greenhorn',
  notes text,
  active boolean default true,
  starred boolean default false,
  user_id uuid references auth.users(id) on delete set null,
  pin text,
  yards_completed numeric default 0,
  reliability_score numeric default 100,
  reward_progress numeric default 0,
  reward_goal numeric default 10,
  rewards_claimed numeric default 0,
  strength_tags text,
  kudos_message text,
  kudos_title text default 'Great Work!',
  kudos_from text default 'Joe''s Mows',
  kudos_read boolean default false,
  kudos_date timestamptz
);

create table public.jobs (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  customer_id text references public.customers(id) on delete cascade,
  customer_name text not null,
  customer_address text,
  scheduled_date date not null,
  status text default 'scheduled',
  service_line text default 'mowing',
  price numeric default 0,
  job_type text default 'Mow',
  notes text,
  recurring_rule text default 'one_time',
  pause_reason text,
  is_recurring boolean default false,
  completed_date timestamptz,
  highlighted boolean default false,
  employee_assignment text default 'helping',
  claimed_by_employee_id text references public.employees(id) on delete set null,
  claimed_by_name text,
  claimed_at timestamptz,
  started_by_name text,
  exclusive_to_employee_id text references public.employees(id) on delete set null,
  exclusive_to_employee_name text,
  needs_help boolean default false,
  timer_started_at timestamptz,
  timer_duration_seconds numeric default 0,
  difficulty numeric default 3,
  custom_employee_pay numeric,
  auto_generated boolean default false
);

create table public.invoices (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  job_id text references public.jobs(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  amount numeric not null default 0,
  status text default 'unpaid',
  payment_method text default 'none',
  due_date date,
  paid_date date,
  notes text,
  description text
);

create table public.expenses (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  amount numeric not null default 0,
  category text not null default 'other',
  description text,
  vendor text,
  date date not null,
  payment_method text default 'other',
  paid boolean default true
);

create table public.equipment (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  name text not null,
  model text,
  type text not null default 'mower',
  status text default 'available',
  assigned_job_id text references public.jobs(id) on delete set null,
  assigned_job_name text,
  jobs_completed numeric default 0,
  hours_used numeric default 0,
  purchase_price numeric default 0,
  resale_value numeric default 0,
  purchase_date date,
  image_url text,
  notes text,
  last_serviced_date date,
  maintenance_state text
);

create table public.equipment_usage (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  equipment_id text references public.equipment(id) on delete cascade,
  equipment_name text,
  job_id text references public.jobs(id) on delete set null,
  job_customer_name text,
  job_date date
);

create table public.mileage (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  date date not null,
  miles numeric not null default 0,
  note text
);

create table public.notes (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  content text not null,
  category text default 'General',
  related_id text,
  title text
);

create table public.rewards (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  name text not null,
  description text,
  jobs_required numeric not null default 10
);

create table public.badges (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  name text not null,
  description text,
  icon text default '🏆',
  criteria_type text not null default 'total_jobs',
  criteria_threshold numeric not null default 10,
  color text default 'emerald'
);

create table public.badge_assignments (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  employee_id text references public.employees(id) on delete cascade not null,
  employee_name text,
  badge_id text references public.badges(id) on delete cascade not null,
  badge_name text
);

create table public.announcements (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  title text not null,
  content text not null,
  target_type text default 'all',
  target_role text,
  target_employee_id text references public.employees(id) on delete set null
);

create table public.chat_messages (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  channel_type text default 'crew',
  channel_id text not null,
  sender_id text not null,
  sender_name text not null,
  sender_role text,
  content text not null
);

create table public.messages (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  employee_id text references public.employees(id) on delete cascade not null,
  employee_name text,
  sender text not null default 'employee',
  content text not null
);

create table public.customer_interactions (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  customer_id text references public.customers(id) on delete cascade not null,
  customer_name text,
  type text not null default 'other',
  description text not null,
  actor_name text default 'Admin'
);

create table public.job_photos (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  job_id text references public.jobs(id) on delete cascade not null,
  customer_name text,
  employee_id text references public.employees(id) on delete set null not null,
  employee_name text,
  image_url text not null,
  scheduled_date date,
  caption text
);

create table public.yard_photos (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  title text not null,
  image_url text not null,
  category text not null default 'Best Work',
  customer_id text references public.customers(id) on delete set null,
  customer_name text
);

create table public.notifications (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  type text not null default 'custom',
  title text not null,
  body text not null,
  link text,
  related_id text,
  severity text default 'info',
  dedup_key text
);

create table public.preset_texts (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  title text not null,
  content text not null,
  category text not null default 'Follow-Ups'
);

create table public.push_subscriptions (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  employee_id text references public.employees(id) on delete set null,
  is_admin boolean default false,
  key_hint text
);

create table public.liabilities (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  name text not null,
  type text not null default 'debt',
  amount numeric not null default 0,
  description text
);

create table public.spectators (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  name text not null,
  code text not null
);

create table public.waitlist_entries (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  name text not null,
  phone text,
  address text,
  service_line text not null default 'mowing',
  set_price numeric default 0,
  notes text,
  customer_id text references public.customers(id) on delete set null,
  status text default 'waiting',
  filled_job_id text references public.jobs(id) on delete set null,
  filled_date timestamptz
);

create table public.business_settings (
  id text primary key default gen_random_uuid()::text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text,
  business_name text not null default 'GreenPro Lawn Care',
  logo_url text,
  phone text,
  email text,
  address text,
  home_address text default '3214 Alta Vista N., San Angelo, Texas',
  default_price numeric default 40,
  late_fee numeric default 5,
  theme text default 'dark',
  notification_email text,
  today_notification_time text default '07:00',
  tomorrow_notification_time text default '18:00',
  timezone_offset numeric default 0,
  cash_on_hand numeric default 0,
  equipment_resale_value numeric default 0,
  overdue_notification_days numeric default 14,
  google_review_link text,
  last_expense_export_month text,
  last_expense_export_date date,
  last_expense_export_url text
);

-- ---------------------------------------------------------------------
-- updated_date triggers
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'customers','employees','jobs','invoices','expenses','equipment',
      'equipment_usage','mileage','notes','rewards','badges','badge_assignments',
      'announcements','chat_messages','messages','customer_interactions',
      'job_photos','yard_photos','notifications','preset_texts',
      'push_subscriptions','liabilities','spectators','waitlist_entries',
      'business_settings'
    ])
  loop
    execute format(
      'create trigger trg_%I_updated before update on public.%I for each row execute function public.set_updated_date();',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'customers','employees','jobs','invoices','expenses','equipment',
      'equipment_usage','mileage','notes','rewards','badges','badge_assignments',
      'announcements','chat_messages','messages','customer_interactions',
      'job_photos','yard_photos','notifications','preset_texts',
      'push_subscriptions','liabilities','spectators','waitlist_entries',
      'business_settings'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Admin-only tables: full CRUD restricted to admins.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'customers','equipment','equipment_usage','mileage','notes',
      'notifications','preset_texts','liabilities','spectators',
      'waitlist_entries','yard_photos','business_settings'
    ])
  loop
    execute format('create policy "%1$s_admin_all" on public.%1$s for all using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- Read open to any signed-in user, writes admin-only: Badge, BadgeAssignment, Reward
do $$
declare
  t text;
begin
  for t in select unnest(array['badges','badge_assignments','rewards'])
  loop
    execute format('create policy "%1$s_read_authenticated" on public.%1$s for select using (auth.uid() is not null);', t);
    execute format('create policy "%1$s_write_admin" on public.%1$s for insert with check (public.is_admin());', t);
    execute format('create policy "%1$s_update_admin" on public.%1$s for update using (public.is_admin());', t);
    execute format('create policy "%1$s_delete_admin" on public.%1$s for delete using (public.is_admin());', t);
  end loop;
end $$;

-- Announcement: same read-open pattern, but target_employee_id doesn't restrict read (kept simple).
create policy "announcements_read_authenticated" on public.announcements for select using (auth.uid() is not null);
create policy "announcements_write_admin" on public.announcements for insert with check (public.is_admin());
create policy "announcements_update_admin" on public.announcements for update using (public.is_admin());
create policy "announcements_delete_admin" on public.announcements for delete using (public.is_admin());

-- ChatMessage / Message: any signed-in user can read + post, only admin edits/deletes.
do $$
declare
  t text;
begin
  for t in select unnest(array['chat_messages','messages'])
  loop
    execute format('create policy "%1$s_read_authenticated" on public.%1$s for select using (auth.uid() is not null);', t);
    execute format('create policy "%1$s_create_authenticated" on public.%1$s for insert with check (auth.uid() is not null);', t);
    execute format('create policy "%1$s_update_admin" on public.%1$s for update using (public.is_admin());', t);
    execute format('create policy "%1$s_delete_admin" on public.%1$s for delete using (public.is_admin());', t);
  end loop;
end $$;

-- CustomerInteraction / Expense / Invoice: any signed-in user can create, only admin reads/edits/deletes.
do $$
declare
  t text;
begin
  for t in select unnest(array['customer_interactions','expenses','invoices'])
  loop
    execute format('create policy "%1$s_create_authenticated" on public.%1$s for insert with check (auth.uid() is not null);', t);
    execute format('create policy "%1$s_admin_read" on public.%1$s for select using (public.is_admin());', t);
    execute format('create policy "%1$s_admin_update" on public.%1$s for update using (public.is_admin());', t);
    execute format('create policy "%1$s_admin_delete" on public.%1$s for delete using (public.is_admin());', t);
  end loop;
end $$;

-- Employee: any signed-in user can create their own record; an employee can
-- read/update their own row (matched by user_id), admin can do anything.
create policy "employees_create_authenticated" on public.employees for insert with check (auth.uid() is not null);
create policy "employees_read_own_or_admin" on public.employees for select using (user_id = auth.uid() or public.is_admin());
create policy "employees_update_own_or_admin" on public.employees for update using (user_id = auth.uid() or public.is_admin());
create policy "employees_delete_admin" on public.employees for delete using (public.is_admin());

-- JobPhoto: any signed-in user can create/read/delete, only admin updates.
create policy "job_photos_create_authenticated" on public.job_photos for insert with check (auth.uid() is not null);
create policy "job_photos_read_authenticated" on public.job_photos for select using (auth.uid() is not null);
create policy "job_photos_update_admin" on public.job_photos for update using (public.is_admin());
create policy "job_photos_delete_authenticated" on public.job_photos for delete using (auth.uid() is not null);

-- PushSubscription: any signed-in device can create/remove its own subscription; admin reads/updates.
create policy "push_subscriptions_create_authenticated" on public.push_subscriptions for insert with check (auth.uid() is not null);
create policy "push_subscriptions_delete_authenticated" on public.push_subscriptions for delete using (auth.uid() is not null);
create policy "push_subscriptions_read_admin" on public.push_subscriptions for select using (public.is_admin());
create policy "push_subscriptions_update_admin" on public.push_subscriptions for update using (public.is_admin());

-- Job: the Base44 export had no explicit rls block for this entity. Employees
-- need to read the schedule and update status (claim/start/complete), so:
-- read/update open to any signed-in user, insert/delete admin-only (scheduling).
create policy "jobs_read_authenticated" on public.jobs for select using (auth.uid() is not null);
create policy "jobs_update_authenticated" on public.jobs for update using (auth.uid() is not null);
create policy "jobs_create_admin" on public.jobs for insert with check (public.is_admin());
create policy "jobs_delete_admin" on public.jobs for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- realtime (tables the UI subscribes to for live updates)
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table
  public.jobs, public.invoices, public.customers, public.expenses,
  public.announcements, public.chat_messages;

-- ---------------------------------------------------------------------
-- storage (uploaded images: yard photos, job photos, equipment, logo)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "uploads_public_read" on storage.objects
  for select using (bucket_id = 'uploads');
create policy "uploads_authenticated_write" on storage.objects
  for insert with check (bucket_id = 'uploads' and auth.uid() is not null);
create policy "uploads_authenticated_update" on storage.objects
  for update using (bucket_id = 'uploads' and auth.uid() is not null);
create policy "uploads_authenticated_delete" on storage.objects
  for delete using (bucket_id = 'uploads' and auth.uid() is not null);
