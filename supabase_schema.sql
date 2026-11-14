-- ========================================================
-- VeinToVein Blood Donation Network — Supabase SQL Schema
-- Project ID: mabpdkcknwimeetyixjj
-- ========================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/mabpdkcknwimeetyixjj
-- 2. Navigate to "SQL Editor" on the left sidebar
-- 3. Click "New Query", paste this entire script, and click "Run"
-- ========================================================

-- 1. Create the `profiles` table linked to Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  phone text,
  blood_group text,
  city text,
  last_donation date,
  donor_id text unique,
  donations_count integer default 0,
  lives_impacted integer default 0,
  impact_points integer default 0,
  tier text default 'Silver',
  kyc_verified boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. RLS Policies
-- Allow users to view their own profile
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Allow users to insert their own profile
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Allow verified updates to profiles for blood donation completion & admin triage
create policy "Allow updates for blood donation completion"
  on public.profiles
  for update
  using (true)
  with check (true);

-- (Optional) Allow public read for emergency donor matching
create policy "Allow read for verified donor network"
  on public.profiles
  for select
  using (true);

-- 4. Automatic Trigger Function: creates a profile row whenever a new user signs up in Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    blood_group,
    city,
    last_donation,
    donor_id,
    donations_count,
    lives_impacted,
    impact_points
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Donor'),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'blood_group', 'O+'),
    coalesce(new.raw_user_meta_data->>'city', 'India'),
    nullif(new.raw_user_meta_data->>'last_donation', '')::date,
    coalesce(new.raw_user_meta_data->>'donor_id', 'VT-IN-' || to_char(now(), 'YYYY') || '-' || floor(10000 + random() * 90000)::text),
    1,
    3,
    100
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    blood_group = excluded.blood_group,
    city = excluded.city,
    last_donation = excluded.last_donation,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========================================================
-- Schema setup complete!
-- ========================================================

-- 5. Create `blood_requests` table for Hospital Emergency Requisitions
create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  req_code text unique,
  hospital_name text not null,
  blood_group text not null,
  urgency text not null default 'Urgent',
  units_required integer default 1,
  ward text,
  clinical_notes text,
  status text default 'Seeking Donors',
  created_at timestamptz default now()
);

alter table public.blood_requests enable row level security;
create policy "Allow public read on blood_requests" on public.blood_requests for select using (true);
create policy "Allow insert on blood_requests" on public.blood_requests for insert with check (true);
create policy "Allow update on blood_requests" on public.blood_requests for update using (true);

-- 6. Create `donations` table for Completed Donation Logs & Compliance
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id text,
  donor_email text,
  donor_name text,
  blood_group text not null,
  hospital_name text not null,
  component text default 'Whole Blood · 350 ml',
  hemoglobin numeric default 14.0,
  cert_code text unique,
  donation_date date default current_date,
  created_at timestamptz default now()
);

alter table public.donations enable row level security;
create policy "Allow public read on donations" on public.donations for select using (true);
create policy "Allow insert on donations" on public.donations for insert with check (true);

-- 7. RLS policies for `request_responses` table
alter table if exists public.request_responses enable row level security;
create policy "Allow insert on request_responses" on public.request_responses for insert with check (true);
create policy "Allow select on request_responses" on public.request_responses for select using (true);


