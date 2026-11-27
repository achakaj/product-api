const express = require('express');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const errorHandler = require('./src/middlewares/errorHandler');

// L'application est séparée de index.js pour que les tests (supertest) l'utilisent
// sans démarrer le serveur.
const app = express();

app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
