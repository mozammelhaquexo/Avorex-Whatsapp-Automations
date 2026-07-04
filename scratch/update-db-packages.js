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
    
    // 1. Update Standard -> Starter
    await client.query(`
      UPDATE public.packages 
      SET 
        name = 'Starter', 
        price_bdt = 499, 
        duration_days = 30, 
        device_limit = 1, 
        popular_badge = false, 
        display_order = 1,
        features = ARRAY[
          'Dashboard Access', 
          'Basic Inbox Messaging', 
          'Simple Contacts List', 
          '1,000 Broadcasts / day', 
          '1 WhatsApp Connection'
        ]
      WHERE code = 'Standard';
    `);

    // 2. Update Premium
    await client.query(`
      UPDATE public.packages 
      SET 
        name = 'Premium', 
        price_bdt = 999, 
        duration_days = 30, 
        device_limit = 3, 
        popular_badge = true, 
        display_order = 2,
        features = ARRAY[
          'Everything in Starter', 
          'Pipelines & custom deal boards', 
          'Visual Automation Flow Editor', 
          'Unlimited Daily Broadcasts', 
          'Up to 3 WhatsApp Connections'
        ]
      WHERE code = 'Premium';
    `);

    // 3. Update Enterprise -> Max
    await client.query(`
      UPDATE public.packages 
      SET 
        name = 'Max', 
        price_bdt = 1499, 
        duration_days = 30, 
        device_limit = 99, 
        popular_badge = false, 
        display_order = 3,
        features = ARRAY[
          'Full software access', 
          'All current and future modules', 
          'AI Agents (OpenRouter/OpenCode)', 
          'Unlimited WhatsApp Channels', 
          'Priority Support'
        ]
      WHERE code = 'Enterprise';
    `);

    console.log('Successfully updated packages details in database!');
    
    const res = await client.query('SELECT id, name, code, price_bdt, display_order FROM public.packages ORDER BY display_order ASC');
    console.log('Packages table now:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
