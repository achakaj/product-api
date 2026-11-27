// Gestion centralisée des erreurs (déclaré après les routes)
module.exports = (err, req, res, next) => {
  console.error(err);

  // nom de catégorie déjà utilisé (colonne UNIQUE)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Category name already exists' });
  }

  // erreurs prévues : "not found" (404), category_id invalide (400), JSON mal formé (400)...
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.message && err.message.includes('not found')) {
    return res.status(404).json({ error: err.message });
  }

  // erreur imprévue (base de données indisponible, bug...) : pas de détail technique au client
  res.status(500).json({ error: 'Internal server error' });
};
