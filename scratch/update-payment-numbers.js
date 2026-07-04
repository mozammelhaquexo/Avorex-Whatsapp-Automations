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
    
    // support_whatsapp = '01575813644' and bkash, nagad, rocket = '+8801754967976'
    const sql = `
      UPDATE public.branding_settings
      SET 
        support_whatsapp = '01575813644',
        bkash_number = '+8801754967976',
        nagad_number = '+8801754967976',
        rocket_number = '+8801754967976',
        updated_at = now()
      WHERE is_default = true;
    `;
    
    await client.query(sql);
    console.log('Successfully updated database payment numbers to +8801754967976!');
    
    const res = await client.query('SELECT * FROM public.branding_settings WHERE is_default = true LIMIT 1');
    console.log('Updated Branding Row:', res.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
