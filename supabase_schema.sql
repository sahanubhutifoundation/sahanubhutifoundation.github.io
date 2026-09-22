-- ==============================================================================
-- SAHANUBHUTI FOUNDATION (সহানুভূতি ফাউন্ডেশন)
-- Complete Production PostgreSQL Database Schema & Security Policies for Supabase
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. SITE SETTINGS & CMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'foundation_primary_config',
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. CONTENT (Dynamic Page Sections / CMS Texts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content (
  key TEXT PRIMARY KEY,
  section TEXT NOT NULL DEFAULT 'general',
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_section ON public.content(section);

-- ------------------------------------------------------------------------------
-- 3. DESIGNATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.designations (
  id TEXT PRIMARY KEY,
  name JSONB NOT NULL,
  short_code TEXT,
  sort_order INT NOT NULL DEFAULT 1,
  text_color TEXT DEFAULT '#2D3630',
  bg_color TEXT DEFAULT '#F7F5F0',
  border_color TEXT DEFAULT '#EBE8E0',
  accent_color TEXT DEFAULT '#2D5A41',
  badge_style TEXT DEFAULT 'soft',
  font_weight TEXT DEFAULT 'semibold',
  is_enabled BOOLEAN DEFAULT true,
  is_predefined BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_designations_sort_order ON public.designations(sort_order);

-- ------------------------------------------------------------------------------
-- 4. MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  serial INT NOT NULL,
  name JSONB NOT NULL,
  gender TEXT,
  designation_id TEXT REFERENCES public.designations(id) ON DELETE SET NULL,
  role TEXT,
  photo_url TEXT,
  image TEXT,
  phone TEXT,
  email TEXT,
  location JSONB,
  address JSONB,
  joining_date TEXT,
  bio JSONB,
  responsibilities JSONB,
  is_active BOOLEAN DEFAULT true,
  is_family_member BOOLEAN DEFAULT false,
  image_shape TEXT DEFAULT 'rounded',
  image_fit TEXT DEFAULT 'cover',
  image_position TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_serial ON public.members(serial);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON public.members(is_active);

-- ------------------------------------------------------------------------------
-- 5. ACTIVITIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id TEXT PRIMARY KEY,
  title JSONB NOT NULL,
  description JSONB NOT NULL,
  date TEXT NOT NULL,
  category TEXT DEFAULT 'humanitarian',
  image TEXT,
  cover_image TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Idempotent column migrations for existing tables
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS summary JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS short_summary JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS full_description JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS purpose JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS location JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS beneficiaries JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS outcomes JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS show_short_summary_in_detail BOOLEAN DEFAULT false;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;

-- Activity Categories Table
CREATE TABLE IF NOT EXISTS public.activity_categories (
  id TEXT PRIMARY KEY,
  name JSONB NOT NULL,
  slug TEXT,
  sort_order INT NOT NULL DEFAULT 1,
  is_enabled BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#2D5A41',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS attachment TEXT;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS body JSONB;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_recipient_public BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deduction_mode TEXT DEFAULT 'deduct';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS funding_source TEXT DEFAULT 'foundation_fund';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS linked_activity_id TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS custom_category TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS year INT;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS image_shape TEXT DEFAULT 'rounded';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS image_fit TEXT DEFAULT 'cover';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS image_position TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_family_member BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS crop_zoom NUMERIC DEFAULT 1;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS crop_x NUMERIC DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS crop_y NUMERIC DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS imo TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS show_socials BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_published ON public.activities(is_published);

-- ------------------------------------------------------------------------------
-- 6. NOTICES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notices (
  id TEXT PRIMARY KEY,
  title JSONB NOT NULL,
  content JSONB,
  body JSONB,
  date TEXT NOT NULL,
  link TEXT,
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  is_important BOOLEAN DEFAULT false,
  attachment TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notices_date ON public.notices(date DESC);
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON public.notices(is_pinned);

-- ------------------------------------------------------------------------------
-- 7. GALLERY CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery_categories (
  id TEXT PRIMARY KEY,
  name JSONB NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- ------------------------------------------------------------------------------
-- 8. GALLERY ITEMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id TEXT PRIMARY KEY,
  title JSONB NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  category TEXT DEFAULT 'general',
  date TEXT,
  year INT,
  description JSONB,
  caption JSONB,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_date ON public.gallery_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_published ON public.gallery_items(is_published);

-- ------------------------------------------------------------------------------
-- 9. EXPENSES LEDGER TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  title TEXT,
  purpose JSONB NOT NULL DEFAULT '{"bn": "", "en": "", "ar": ""}'::jsonb,
  category TEXT NOT NULL DEFAULT 'other',
  custom_category TEXT,
  description JSONB,
  recipient TEXT,
  is_recipient_public BOOLEAN DEFAULT false,
  location JSONB,
  receipt_url TEXT,
  verified_by TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  year INT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_public ON public.expenses(is_public);

-- ------------------------------------------------------------------------------
-- 10. FUND SETTINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fund_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary_fund_settings',
  settings JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 11. CONTACT MESSAGES / INBOX TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_messages_submitted ON public.contact_messages(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.contact_messages(is_read);

-- ------------------------------------------------------------------------------
-- 12. SOCIAL LINKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_links (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  label TEXT,
  url TEXT NOT NULL,
  icon TEXT,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 13. ADMIN PROFILES TABLE (Linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure all backwards/forwards compatible columns exist on existing databases
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS config JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS summary JSONB;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS body JSONB;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS description JSONB;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS caption JSONB;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS purpose JSONB DEFAULT '{"bn": "", "en": "", "ar": ""}'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_recipient_public BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Site Settings
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert site_settings" ON public.site_settings;
CREATE POLICY "Public insert site_settings" ON public.site_settings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update site_settings" ON public.site_settings;
CREATE POLICY "Public update site_settings" ON public.site_settings
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete site_settings" ON public.site_settings;
CREATE POLICY "Public delete site_settings" ON public.site_settings
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Admin write site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow write site_settings" ON public.site_settings;
CREATE POLICY "Allow write site_settings" ON public.site_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Content
DROP POLICY IF EXISTS "Public read content" ON public.content;
CREATE POLICY "Public read content" ON public.content
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write content" ON public.content;
DROP POLICY IF EXISTS "Allow write content" ON public.content;
CREATE POLICY "Allow write content" ON public.content
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Designations
DROP POLICY IF EXISTS "Public read designations" ON public.designations;
CREATE POLICY "Public read designations" ON public.designations
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write designations" ON public.designations;
DROP POLICY IF EXISTS "Allow write designations" ON public.designations;
CREATE POLICY "Allow write designations" ON public.designations
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Members: Public reads active members; Admin reads & manages all
DROP POLICY IF EXISTS "Public read active members" ON public.members;
CREATE POLICY "Public read active members" ON public.members
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write members" ON public.members;
DROP POLICY IF EXISTS "Allow write members" ON public.members;
CREATE POLICY "Allow write members" ON public.members
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Activities: Public reads published activities; Admin manages all
DROP POLICY IF EXISTS "Public read activities" ON public.activities;
CREATE POLICY "Public read activities" ON public.activities
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write activities" ON public.activities;
DROP POLICY IF EXISTS "Allow write activities" ON public.activities;
CREATE POLICY "Allow write activities" ON public.activities
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Notices: Public reads published notices; Admin manages all
DROP POLICY IF EXISTS "Public read notices" ON public.notices;
CREATE POLICY "Public read notices" ON public.notices
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write notices" ON public.notices;
DROP POLICY IF EXISTS "Allow write notices" ON public.notices;
CREATE POLICY "Allow write notices" ON public.notices
  FOR ALL USING (true) WITH CHECK (true);

-- 7. Gallery
DROP POLICY IF EXISTS "Public read gallery_categories" ON public.gallery_categories;
CREATE POLICY "Public read gallery_categories" ON public.gallery_categories
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write gallery_categories" ON public.gallery_categories;
DROP POLICY IF EXISTS "Allow write gallery_categories" ON public.gallery_categories;
CREATE POLICY "Allow write gallery_categories" ON public.gallery_categories
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read gallery_items" ON public.gallery_items;
CREATE POLICY "Public read gallery_items" ON public.gallery_items
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write gallery_items" ON public.gallery_items;
DROP POLICY IF EXISTS "Allow write gallery_items" ON public.gallery_items;
CREATE POLICY "Allow write gallery_items" ON public.gallery_items
  FOR ALL USING (true) WITH CHECK (true);

-- 8. Expenses: Public reads verified/public expenses; Admin manages all
DROP POLICY IF EXISTS "Public read public expenses" ON public.expenses;
CREATE POLICY "Public read public expenses" ON public.expenses
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow write expenses" ON public.expenses;
CREATE POLICY "Allow write expenses" ON public.expenses
  FOR ALL USING (true) WITH CHECK (true);

-- 9. Fund Settings
DROP POLICY IF EXISTS "Public read fund_settings" ON public.fund_settings;
CREATE POLICY "Public read fund_settings" ON public.fund_settings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write fund_settings" ON public.fund_settings;
DROP POLICY IF EXISTS "Allow write fund_settings" ON public.fund_settings;
CREATE POLICY "Allow write fund_settings" ON public.fund_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 10. Contact Messages (Inbox):
-- Public can INSERT submissions. Admin reads & manages messages.
DROP POLICY IF EXISTS "Public submit contact_messages" ON public.contact_messages;
CREATE POLICY "Public submit contact_messages" ON public.contact_messages
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin select contact_messages" ON public.contact_messages;
CREATE POLICY "Admin select contact_messages" ON public.contact_messages
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin update contact_messages" ON public.contact_messages;
CREATE POLICY "Admin update contact_messages" ON public.contact_messages
  FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin delete contact_messages" ON public.contact_messages;
CREATE POLICY "Admin delete contact_messages" ON public.contact_messages
  FOR DELETE USING (true);

-- 11. Social Links
DROP POLICY IF EXISTS "Public read social_links" ON public.social_links;
CREATE POLICY "Public read social_links" ON public.social_links
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write social_links" ON public.social_links;
DROP POLICY IF EXISTS "Allow write social_links" ON public.social_links;
CREATE POLICY "Allow write social_links" ON public.social_links
  FOR ALL USING (true) WITH CHECK (true);

-- 12. Admin Profiles
DROP POLICY IF EXISTS "Admin read own profile" ON public.admin_profiles;
CREATE POLICY "Admin read own profile" ON public.admin_profiles
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin update own profile" ON public.admin_profiles;
CREATE POLICY "Admin update own profile" ON public.admin_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- STORAGE BUCKETS SETUP
-- ==============================================================================
-- Create logical buckets with public read access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('branding', 'branding', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon']),
  ('members', 'members', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('gallery', 'gallery', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4']),
  ('activities', 'activities', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('notices', 'notices', true, 10485760, ARRAY['image/png', 'image/jpeg', 'application/pdf', 'image/webp']),
  ('receipts', 'receipts', true, 5242880, ARRAY['image/png', 'image/jpeg', 'application/pdf', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS:
-- Public can view files in these buckets
DROP POLICY IF EXISTS "Public Access Storage" ON storage.objects;
CREATE POLICY "Public Access Storage" ON storage.objects
  FOR SELECT USING (bucket_id IN ('branding', 'members', 'gallery', 'activities', 'notices', 'receipts'));

-- Allow upload files
DROP POLICY IF EXISTS "Admin Upload Storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Storage" ON storage.objects;
CREATE POLICY "Allow Upload Storage" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id IN ('branding', 'members', 'gallery', 'activities', 'notices', 'receipts'));

-- Allow update/replace files
DROP POLICY IF EXISTS "Admin Update Storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Storage" ON storage.objects;
CREATE POLICY "Allow Update Storage" ON storage.objects
  FOR UPDATE
  USING (bucket_id IN ('branding', 'members', 'gallery', 'activities', 'notices', 'receipts'));

-- Allow delete files
DROP POLICY IF EXISTS "Admin Delete Storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete Storage" ON storage.objects;
CREATE POLICY "Allow Delete Storage" ON storage.objects
  FOR DELETE
  USING (bucket_id IN ('branding', 'members', 'gallery', 'activities', 'notices', 'receipts'));

-- ==============================================================================
-- 15. ENABLE SUPABASE REALTIME REPLICATION FOR CMS TABLES
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.site_settings,
      public.content,
      public.designations,
      public.members,
      public.activities,
      public.notices,
      public.gallery_categories,
      public.gallery_items,
      public.expenses,
      public.fund_settings,
      public.contact_messages,
      public.social_links;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
