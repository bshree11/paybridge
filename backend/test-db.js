const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'paybridge',
});

client.connect()
  .then(() => {
    console.log('CONNECTED!');
    return client.query('SELECT 1');
  })
  .then((res) => {
    console.log('Query result:', res.rows);
    client.end();
  })
  .catch((err) => {
    console.log('FAILED:', err.message);
    client.end();
  });