const { Client } = require('pg');

const regions = [
  'ap-southeast-1',
  'ap-south-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-2',
  'ca-central-1',
  'sa-east-1'
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

  console.log('Altering public.license_keys table...');
  const sql = `
    ALTER TABLE public.license_keys 
      ADD COLUMN IF NOT EXISTS duration_type TEXT DEFAULT '30days',
      ADD COLUMN IF NOT EXISTS duration_days INTEGER,
      ADD COLUMN IF NOT EXISTS device_limit INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS user_email TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS allowed_menus TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

    -- Add columns to accounts for tracking license details
    ALTER TABLE public.accounts
      ADD COLUMN IF NOT EXISTS license_activated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS allowed_menus TEXT[] DEFAULT '{}';
  `;

  try {
    await client.query(sql);
    console.log('Successfully altered public.license_keys and public.accounts tables!');
  } catch (err) {
    console.error('Failed to execute DDL queries:', err.message);
  } finally {
    await client.end();
  }
}

run();
