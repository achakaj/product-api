// charge le .env puis bascule sur la base de test avant la creation du pool
require('dotenv').config({ quiet: true });
process.env.DB_NAME = 'lab_product_test';
