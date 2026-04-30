const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'paybridge',
});

async function fixPasswords() {
  await client.connect();
  const hash = await bcrypt.hash('password123', 10);
  
  await client.query(
    "UPDATE users SET password_hash = $1",
    [hash]
  );
  
  console.log('All user passwords set to password123');
  await client.end();
}

fixPasswords();