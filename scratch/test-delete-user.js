const { Client } = require('pg');

const host = 'aws-0-ap-northeast-1.pooler.supabase.com'; // Tokyo region
const port = 6543;
const username = 'postgres.hkwehwrovblatcxplbwz';
const password = 'JHS&hgu3#&gfdgfdf';
const database = 'postgres';

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
    console.log('Connected to DB');

    // List all users in profiles to see who exists and their role
    console.log("Listing profiles...");
    const profilesRes = await client.query(`
      SELECT user_id, email, account_role, account_id 
      FROM public.profiles
    `);
    console.log("Profiles in DB:", profilesRes.rows);

    // List all accounts and their owner_user_id
    console.log("Listing accounts...");
    const accountsRes = await client.query(`
      SELECT id, name, owner_user_id 
      FROM public.accounts
    `);
    console.log("Accounts in DB:", accountsRes.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end().catch(() => {});
  }
}

run();
