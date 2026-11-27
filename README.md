# Lab 6 : Intégration MySQL et programmation asynchrone avec Node.js

Master IAIDDWM, FST Marrakech - cours Développement Backend avec Java, Node.js et PHP.

Ce lab reprend l'API produits du Lab 5 et remplace le tableau en mémoire par une base **MySQL**. Le projet utilise Express, **mysql2** (version avec promesses), un pool de connexions, des requêtes paramétrées, `async/await`, express-validator et une transaction. Le code est en CommonJS (`require` / `module.exports`).

## Prérequis

- Node.js LTS
- MySQL 8 (installé en local ou avec Docker)

## Mise en place de MySQL

Avec Docker :

```bash
docker run -d --name lab6-mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 mysql:8
```

Puis, avec le compte root, on lance les scripts du dossier `sql/` :

```bash
mysql -u root -p --default-character-set=utf8mb4 < sql/create_database.sql
mysql -u root -p --default-character-set=utf8mb4 < sql/create_user.sql
mysql -u root -p --default-character-set=utf8mb4 < sql/seed_data.sql
```

(avec Docker : `docker exec -i lab6-mysql mysql -uroot -proot --default-character-set=utf8mb4 < sql/create_database.sql`, et pareil pour les deux autres)

| Script | Rôle |
|---|---|
| `create_database.sql` | base `lab_product` (utf8mb4), tables `categories` et `products` avec la clé étrangère `fk_category` (ON DELETE SET NULL) |
| `create_user.sql` | utilisateur `lab_user` |
| `seed_data.sql` | 3 catégories (Électronique, Livres, Vêtements) et 3 produits (Smartphone, Roman, T-shirt) |

Les scripts peuvent être relancés sans erreur (`IF NOT EXISTS`, `INSERT IGNORE` avec des id fixes).

**Droits de l'utilisateur.** Le lab donne `GRANT ALL ON *.*`. J'ai préféré limiter les droits aux bases du projet (`GRANT ALL PRIVILEGES ON lab_product.*`, plus `lab_product_test.*` pour les tests) : l'application n'a pas besoin d'accéder aux autres bases du serveur (principe du moindre privilège). Avec MySQL dans Docker, la connexion ne vient pas de `localhost` vu du serveur, l'utilisateur est donc créé avec l'hôte `'%'` ; sur un MySQL installé en local on peut mettre `'localhost'`.

## Configuration

Copier `.env.example` en `.env` et mettre le vrai mot de passe :

```
DB_HOST=localhost
DB_USER=lab_user
DB_PASSWORD=LabPass123!
DB_NAME=lab_product
DB_PORT=3306
PORT=3000
```

Le fichier `.env` n'est jamais commité (il est dans `.gitignore`), seul `.env.example` l'est.

## Lancer le projet

```bash
npm install
npm start        # nodemon index.js : serveur sur http://localhost:3000
npm test         # tests Jest + supertest
```

## Structure

```
product-api/
├── index.js                 point d'entrée : charge .env et démarre le serveur
├── app.js                   application Express (routes, 404, gestion des erreurs)
├── src/
│   ├── config/db.js          pool de connexions mysql2
│   ├── routes/               productRoutes.js, categoryRoutes.js
│   ├── controllers/          productController.js, categoryController.js
│   ├── services/             productService.js, categoryService.js (logique métier, transaction)
│   ├── repositories/         productRepository.js, categoryRepository.js (requêtes SQL)
│   └── middlewares/          validation.js, errorHandler.js
├── sql/                     create_database.sql, create_user.sql, seed_data.sql
├── tests/                   tests Jest + supertest
└── postman/                 collection Postman
```

Chaque couche ne connaît que la couche juste en dessous : route, contrôleur, service, repository, base. L'application est dans `app.js` (et pas directement dans `index.js`) pour que les tests puissent l'importer sans démarrer le serveur.

## Endpoints

| Méthode | URL | Description | Réponses |
|---|---|---|---|
| GET | /api/products | liste des produits | 200 |
| GET | /api/products/:id | un produit | 200, 400, 404 |
| POST | /api/products | créer un produit (`name`, `price`, `category_id` facultatif) | 201, 400 |
| PUT | /api/products/:id | modifier un produit | 200, 400, 404 |
| DELETE | /api/products/:id | supprimer un produit | 204, 400, 404 |
| GET | /api/products/search | recherche avec filtres, tri et pagination | 200, 400 |
| POST | /api/products/with-category | créer un produit et sa catégorie dans une transaction | 201, 400 |
| GET | /api/categories | liste des catégories | 200 |
| GET | /api/categories/:id | une catégorie | 200, 400, 404 |
| POST | /api/categories | créer une catégorie | 201, 400, 409 |
| PUT | /api/categories/:id | renommer une catégorie | 200, 400, 404, 409 |
| DELETE | /api/categories/:id | supprimer une catégorie sans produits | 204, 400, 404 |

**Paramètres de recherche** (tous facultatifs) : `name` (contient), `minPrice`, `maxPrice`, `categoryId`, `limit` (1 à 100, 10 par défaut), `offset` (0 par défaut), `sort` (`id`, `name`, `price` ou `category_id`, `name` par défaut) et `order` (`asc` ou `desc`).

**Règles de validation** : nom du produit de 3 à 150 caractères, prix strictement positif, `category_id` entier positif d'une catégorie existante, nom de catégorie de 2 à 100 caractères, id dans l'URL entier positif.

## Exemples curl

```bash
# créer un produit
curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" \
  -d '{"name":"Casque audio","price":59.99,"category_id":1}'
# 201 {"id":4,"name":"Casque audio","price":59.99,"category_id":1}

# lire, modifier, supprimer
curl http://localhost:3000/api/products/4
curl -X PUT http://localhost:3000/api/products/4 -H "Content-Type: application/json" \
  -d '{"name":"Casque audio","price":49.99,"category_id":1}'
curl -i -X DELETE http://localhost:3000/api/products/4          # 204

# recherche : produits entre 10 et 100, du plus cher au moins cher, 2 par page
curl "http://localhost:3000/api/products/search?minPrice=10&maxPrice=100&sort=price&order=desc&limit=2&offset=0"

# transaction : la catégorie "Informatique" est créée si elle n'existe pas
curl -X POST http://localhost:3000/api/products/with-category -H "Content-Type: application/json" \
  -d '{"name":"Livre SQL","price":29.9,"categoryName":"Informatique"}'

# catégories
curl -X POST http://localhost:3000/api/categories -H "Content-Type: application/json" -d '{"name":"Sport"}'
curl -i -X DELETE http://localhost:3000/api/categories/1        # 400 : des produits sont liés
```

Après chaque écriture on peut vérifier dans MySQL : `SELECT * FROM lab_product.products;`

## Format des erreurs

| Cas | Statut | Corps |
|---|---|---|
| validation express-validator | 400 | `{"errors":[{"msg":"Price must be positive", ...}]}` |
| id non numérique dans l'URL | 400 | `{"errors":[{"msg":"id must be a positive integer", ...}]}` |
| catégorie inexistante pour un produit | 400 | `{"error":"Invalid category_id"}` |
| catégorie qui a encore des produits | 400 | `{"error":"Cannot delete category with linked products"}` |
| produit ou catégorie introuvable | 404 | `{"error":"Product not found"}` |
| nom de catégorie déjà utilisé | 409 | `{"error":"Category name already exists"}` |
| route inconnue | 404 | `{"error":"Route not found"}` |
| erreur imprévue (base indisponible...) | 500 | `{"error":"Internal server error"}` |

## Corrections apportées au code du lab

| # | Problème dans le code du lab | Correction |
|---|---|---|
| 1 | `deleteCategory` faisait `const [products] = await productRepo.getAll()`, mais `getAll` renvoie déjà le tableau des lignes : la déstructuration prenait seulement le premier produit | requête dédiée `countByCategory(Number(id))` qui compte les produits liés |
| 2 | `req.params.id` arrive en chaîne | conversion avec `Number()` dans les contrôleurs et `toInt()` dans la validation |
| 3 | `ORDER BY ${sort}` permettait une injection SQL ; `pool.execute` avec `LIMIT ? OFFSET ?` peut échouer avec mysql2 | liste blanche des colonnes (`id`, `name`, `price`, `category_id`) et du sens (`asc`, `desc`), validation de `limit` (1 à 100) et `offset`, requête lancée avec `pool.query` |
| 4 | le gestionnaire d'erreurs renvoyait 400 pour toute erreur, même une panne de la base | les erreurs prévues portent un statut (`err.status`), "not found" donne 404, un nom en double (`ER_DUP_ENTRY`) donne 409, le reste donne 500 avec un message générique |
| 5 | un id non numérique arrivait jusqu'à la base | validation `param('id').isInt({ gt: 0 })` sur toutes les routes `/:id` (400) |
| 6 | suppression d'une catégorie liée à des produits | bloquée par le service (400) ; la clé étrangère garde `ON DELETE SET NULL` |
| 7 | mysql2 renvoie les colonnes DECIMAL en chaîne (`"59.99"`) | option `decimalNumbers: true` dans le pool : `price` est un nombre dans les réponses |

Autres ajouts : `/search` et `/with-category` sont déclarées avant `/:id`, un prix trop grand pour `DECIMAL(10,2)` ou un nom trop long sont refusés par la validation (400) au lieu de provoquer une erreur SQL.

## Tests

- **Jest + supertest** (`npm test`) : les tests tournent sur une base séparée `lab_product_test`, recréée au début de chaque lancement à partir des scripts SQL. Ils couvrent le CRUD des produits et des catégories, la validation (400), les 404, le refus de supprimer une catégorie liée, la recherche (filtres, tri, pagination, injection SQL) et la transaction, y compris le rollback : une erreur est forcée sur l'insertion du produit et on vérifie que la nouvelle catégorie n'a pas été gardée.
- **Postman** : importer `postman/Product API.postman_collection.json` et `postman/Product API.postman_environment.json`, démarrer l'API, puis lancer la collection (41 requêtes). Elle utilise des noms uniques et supprime ce qu'elle crée, donc on peut la relancer sans réinitialiser la base.

```bash
newman run "postman/Product API.postman_collection.json" -e "postman/Product API.postman_environment.json"
```

## Ce que j'ai appris

- **mysql2 et le pool de connexions** : les connexions sont réutilisées, et toutes les requêtes sont paramétrées (`?`) pour éviter les injections SQL.
- **Architecture en couches** : routes, contrôleurs, services et repositories ont chacun leur rôle.
- **async/await et gestion des erreurs** : chaque contrôleur passe les erreurs à `next(err)`, et un seul middleware choisit le bon code HTTP.
- **CRUD, filtres et pagination** : requête construite avec `WHERE 1=1`, `LIKE`, `ORDER BY` en liste blanche et `LIMIT / OFFSET`.
- **Validation** : express-validator vérifie les données avant d'arriver au service.
- **Transactions** : `beginTransaction`, `commit`, `rollback` en cas d'erreur, et `release` de la connexion dans le `finally`.

## Suite

- Ajouter de la documentation Swagger
- Essayer un ORM (Sequelize ou TypeORM)
- Ajouter une authentification JWT
