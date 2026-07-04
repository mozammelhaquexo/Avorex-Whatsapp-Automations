const { Client } = require('pg');

const regions = [
  'ap-southeast-1', // Singapore
  'ap-south-1',     // Mumbai
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-central-1',   // Frankfurt
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-southeast-2', // Sydney
  'ca-central-1',   // Canada Central
  'sa-east-1'       // São Paulo
];

const username = 'postgres.hkwehwrovblatcxplbwz';
const password = 'JHS&hgu3#&gfdgfdf';
const database = 'postgres';
const port = 6543;

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new Client({
    host,
    port,
    user: username,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    return client;
  } catch (err) {
    await client.end().catch(() => {});
    return null;
  }
}

async function run() {
  console.log('Connecting to database...');
  let client = null;
  for (const region of regions) {
    client = await testRegion(region);
    if (client) {
      console.log(`Connected to region: ${region}`);
      break;
    }
  }

  if (!client) {
    console.error('Could not connect to database pooler.');
    process.exit(1);
  }

  console.log('Applying migrations for billing & payment activation...');
  
  const sql = `
    -- 1. Create branding_settings table
    CREATE TABLE IF NOT EXISTS public.branding_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      is_default BOOLEAN DEFAULT true UNIQUE,
      software_name TEXT NOT NULL DEFAULT 'Avorex Whatsapp Automation',
      brand_name TEXT NOT NULL DEFAULT 'Avorex',
      brand_logo_url TEXT,
      support_whatsapp TEXT NOT NULL DEFAULT '01754967976',
      bkash_number TEXT NOT NULL DEFAULT '01754967976',
      nagad_number TEXT NOT NULL DEFAULT '01754967976',
      rocket_number TEXT NOT NULL DEFAULT '01754967976',
      payment_instruction TEXT NOT NULL DEFAULT 'আপনার নির্বাচিত প্যাকেজের নির্ধারিত টাকা bKash, Nagad অথবা Rocket-এর মাধ্যমে Send Money করুন। টাকা পাঠানোর পর Transaction ID নিচে লিখে সাবমিট করুন।',
      currency TEXT NOT NULL DEFAULT 'BDT',
      currency_symbol TEXT NOT NULL DEFAULT '৳',
      default_country TEXT NOT NULL DEFAULT 'Bangladesh',
      payment_type TEXT NOT NULL DEFAULT 'Send Money',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Insert default branding setting row
    INSERT INTO public.branding_settings (is_default)
    VALUES (true)
    ON CONFLICT (is_default) DO NOTHING;

    -- 2. Alter packages table to add new columns
    ALTER TABLE public.packages
      ADD COLUMN IF NOT EXISTS price_bdt NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30,
      ADD COLUMN IF NOT EXISTS device_limit INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS popular_badge BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS allowed_submenus TEXT[] NOT NULL DEFAULT '{}';

    -- Seed BDT prices if not already set
    UPDATE public.packages SET price_bdt = 499, duration_days = 30, device_limit = 1, popular_badge = false, display_order = 1 WHERE code = 'Starter';
    UPDATE public.packages SET price_bdt = 999, duration_days = 30, device_limit = 3, popular_badge = true, display_order = 2 WHERE code = 'Premium';
    UPDATE public.packages SET price_bdt = 1499, duration_days = 30, device_limit = 99, popular_badge = false, display_order = 3 WHERE code = 'Max';

    -- 3. Create payment_requests table
    CREATE TABLE IF NOT EXISTS public.payment_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id TEXT NOT NULL UNIQUE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
      payment_method TEXT NOT NULL,
      sender_number TEXT NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      expected_amount NUMERIC NOT NULL,
      paid_amount NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      admin_note TEXT,
      payment_note TEXT,
      package_name TEXT NOT NULL,
      package_duration TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL
    );

    -- Index for unique transaction verification
    CREATE INDEX IF NOT EXISTS idx_payment_requests_trx ON public.payment_requests(transaction_id);

    -- 4. Alter license_keys to support package references
    ALTER TABLE public.license_keys
      ADD COLUMN IF NOT EXISTS license_public_id TEXT,
      ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL;

    -- 5. Enable real-time replication for accounts and payment_requests
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'accounts'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'payment_requests'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests;
        END IF;
      END IF;
    END $$;

    -- 6. Setup RLS policies on payment_requests and branding_settings
    ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies to make this script re-runnable
    DROP POLICY IF EXISTS branding_settings_select ON public.branding_settings;
    DROP POLICY IF EXISTS branding_settings_admin ON public.branding_settings;
    DROP POLICY IF EXISTS payment_requests_select ON public.payment_requests;
    DROP POLICY IF EXISTS payment_requests_insert ON public.payment_requests;
    DROP POLICY IF EXISTS payment_requests_admin ON public.payment_requests;

    -- Branding settings RLS
    CREATE POLICY branding_settings_select ON public.branding_settings
      FOR SELECT USING (true);

    CREATE POLICY branding_settings_admin ON public.branding_settings
      FOR ALL USING (auth.jwt() ->> 'email' = 'admin@avorex.com');

    -- Payment requests RLS
    CREATE POLICY payment_requests_select ON public.payment_requests
      FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'admin@avorex.com');

    CREATE POLICY payment_requests_insert ON public.payment_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY payment_requests_admin ON public.payment_requests
      FOR ALL USING (auth.jwt() ->> 'email' = 'admin@avorex.com');
  `;

  try {
    await client.query(sql);
    console.log('Successfully completed payment & licensing database schema updates!');
  } catch (err) {
    console.error('Failed to execute DDL queries:', err.message);
  } finally {
    await client.end();
  }
}

run();
