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

    // Find a test user to delete, or see the foreign key constraints pointing to auth.users
    console.log("Finding foreign key constraints pointing to auth.users...");
    const res = await client.query(`
      SELECT 
        tc.table_schema, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'users' 
        AND ccu.table_schema = 'auth';
    `);

    console.log("Constraints pointing to auth.users:");
    console.log(res.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end().catch(() => {});
  }
}

run();
