const { Client } = require('pg');

const regions = [
  'ap-southeast-1', // Singapore (very common)
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

  console.log('Creating public.packages table...');
  const sql = `
    CREATE TABLE IF NOT EXISTS public.packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      features TEXT[] NOT NULL DEFAULT '{}',
      price TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Seed standard packages
    INSERT INTO public.packages (name, code, features, price)
    VALUES 
    ('Standard Plan', 'Standard', ARRAY['1 WhatsApp Connection', 'Basic Inbox Messaging', 'Simple Contacts List', '1,000 Broadcasts / day'], '$49/mo'),
    ('Premium Plan', 'Premium', ARRAY['Up to 3 WhatsApp Connections', 'Visual Automation Flow Editor', 'Pipelines & custom deal boards', 'Unlimited Daily Broadcasts'], '$99/mo'),
    ('Enterprise Plan', 'Enterprise', ARRAY['Unlimited WhatsApp Channels', 'Full AI Agents (OpenRouter/OpenCode)', 'Tenancy Sidebar Menu Permission Gating', 'Premium 24/7 dedicated support'], '$299/mo')
    ON CONFLICT (code) DO NOTHING;
  `;

  try {
    await client.query(sql);
    console.log('Successfully created and seeded public.packages table!');
  } catch (err) {
    console.error('Failed to execute DDL queries:', err.message);
  } finally {
    await client.end();
  }
}

run();
