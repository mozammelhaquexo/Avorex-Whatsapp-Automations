const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
const username = 'postgres.hkwehwrovblatcxplbwz';
const password = 'JHS&hgu3#&gfdgfdf';
const database = 'postgres';
const port = 6543;

async function run() {
  const client = new Client({
    host,
    port,
    user: username,
    password,
    database,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB...');
    // Drop and recreate constraint to allow other types
    await client.query(`
      ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
      ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('conversation_assigned', 'license_activated', 'payment_rejected'));
    `);
    console.log('Successfully altered notifications constraint!');
  } catch (err) {
    console.error('Error: ', err.message);
  } finally {
    await client.end();
  }
}

run();
