const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const TEST_DB = 'lab_product_test';

function readSql(file) {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', file), 'utf8');
  // \b evite de transformer lab_product_test en lab_product_test_test
  return sql.replace(/\blab_product\b/g, TEST_DB);
}

module.exports = async () => {
  require('dotenv').config({ quiet: true });

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 3306,
    charset: 'utf8mb4',
    multipleStatements: true
  });

  try {
    // on repart toujours des donnees de depart
    await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await conn.query(readSql('create_database.sql'));
    await conn.query(readSql('seed_data.sql'));
  } finally {
    await conn.end();
  }
};
