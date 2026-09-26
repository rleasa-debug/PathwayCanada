-- ==============================================================================
-- Pathway Canada: Production Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Profiles Table (Synced with auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  is_pro boolean default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- 3. Student Academic Records Table (Persistent Cloud Portfolio)
create table if not exists public.student_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  province text default 'ON',
  calculated_average numeric,
  courses jsonb default '[]'::jsonb,
  saved_programs jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_records unique (user_id)
);

-- Enable RLS for student_records
alter table public.student_records enable row level security;

-- Policies for student_records
create policy "Users can view own student records" 
  on public.student_records for select 
  using (auth.uid() = user_id);

create policy "Users can insert own student records" 
  on public.student_records for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own student records" 
  on public.student_records for update 
  using (auth.uid() = user_id);

-- 4. Automatic Profile Creation on User Sign-Up Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, is_pro)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    false
  );
  
  insert into public.student_records (user_id, courses)
  values (new.id, '[]'::jsonb)
  on conflict (user_id) do nothing;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Updated_at Auto Timestamp Trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_student_records_updated_at
  before update on public.student_records
  for each row execute procedure public.handle_updated_at();
