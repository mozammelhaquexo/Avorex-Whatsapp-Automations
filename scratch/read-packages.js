const { Client } = require('pg');

const username = 'postgres.hkwehwrovblatcxplbwz';
const password = 'JHS&hgu3#&gfdgfdf';
const database = 'postgres';
const port = 6543;
const host = 'aws-0-ap-northeast-1.pooler.supabase.com';

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
    const res = await client.query("SELECT * FROM public.accounts WHERE id = '78fbedf5-692a-4b1d-9dde-777541cc243c'");
    console.log('Account:', res.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
