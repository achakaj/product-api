const mysql = require('mysql2/promise');

// Pool de connexions MySQL : les connexions sont réutilisées au lieu d'en ouvrir une par requête
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // les colonnes DECIMAL (price) arrivent en nombre et pas en chaîne
  decimalNumbers: true
});

module.exports = pool;
