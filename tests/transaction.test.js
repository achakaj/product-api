const request = require('supertest');
const app = require('../app');
const pool = require('../src/config/db');

const suffix = Date.now();

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(async () => {
  console.error.mockRestore();
  await pool.end();
});

describe('POST /api/products/with-category', () => {
  test('nouvelle categorie : 201 et categorie creee en base', async () => {
    const categoryName = `Jouets ${suffix}`;
    const res = await request(app)
      .post('/api/products/with-category')
      .send({ name: `Puzzle ${suffix}`, price: 15.5, categoryName });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), name: `Puzzle ${suffix}`, price: 15.5, category_id: expect.any(Number) });

    const [cats] = await pool.query('SELECT * FROM categories WHERE name = ?', [categoryName]);
    expect(cats).toHaveLength(1);
    expect(cats[0].id).toBe(res.body.category_id);

    const [prods] = await pool.query('SELECT * FROM products WHERE id = ?', [res.body.id]);
    expect(prods[0]).toMatchObject({ name: `Puzzle ${suffix}`, price: 15.5, category_id: cats[0].id });
  });

  test('categorie existante "Livres" : reutilisee sans doublon', async () => {
    const res = await request(app)
      .post('/api/products/with-category')
      .send({ name: `Essai ${suffix}`, price: 12, categoryName: 'Livres' });

    expect(res.status).toBe(201);
    expect(res.body.category_id).toBe(2);

    const [cats] = await pool.query('SELECT * FROM categories WHERE name = ?', ['Livres']);
    expect(cats).toHaveLength(1);
    expect(cats[0].id).toBe(2);
  });

  test('sans categoryName : 400', async () => {
    const res = await request(app)
      .post('/api/products/with-category')
      .send({ name: `Sans cat ${suffix}`, price: 5 });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.msg)).toContain('Category name too short');
  });

  test('categoryName trop court : 400', async () => {
    const res = await request(app)
      .post('/api/products/with-category')
      .send({ name: `Court ${suffix}`, price: 5, categoryName: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.msg)).toContain('Category name too short');
  });

  test('produit invalide : 400 et aucune categorie creee', async () => {
    const categoryName = `Invalide ${suffix}`;
    const res = await request(app)
      .post('/api/products/with-category')
      .send({ name: 'ab', price: -1, categoryName });
    expect(res.status).toBe(400);

    const [cats] = await pool.query('SELECT * FROM categories WHERE name = ?', [categoryName]);
    expect(cats).toHaveLength(0);
  });
});

describe('ROLLBACK de la transaction', () => {
  test('erreur sur l\'INSERT du produit : 500 et la categorie n\'est pas gardee', async () => {
    const categoryName = `Rollback ${suffix}`;
    const productName = `Produit rollback ${suffix}`;
    const realGetConnection = pool.getConnection.bind(pool);

    const spy = jest.spyOn(pool, 'getConnection').mockImplementation(async () => {
      const conn = await realGetConnection();
      const realExecute = conn.execute.bind(conn);
      conn.execute = (sql, params) => {
        if (sql.startsWith('INSERT INTO products')) {
          return Promise.reject(new Error('panne simulee'));
        }
        return realExecute(sql, params);
      };
      return conn;
    });

    let res;
    let calls;
    try {
      res = await request(app)
        .post('/api/products/with-category')
        .send({ name: productName, price: 10, categoryName });
      calls = spy.mock.calls.length;
    } finally {
      spy.mockRestore();
    }

    expect(calls).toBe(1);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });

    const [cats] = await pool.query('SELECT * FROM categories WHERE name = ?', [categoryName]);
    expect(cats).toHaveLength(0);
    const [prods] = await pool.query('SELECT * FROM products WHERE name = ?', [productName]);
    expect(prods).toHaveLength(0);

    // la connexion a ete liberee : le pool repond toujours
    const after = await request(app).get('/api/products');
    expect(after.status).toBe(200);
  });

  test('apres le rollback, la meme requete passe normalement', async () => {
    const categoryName = `Rollback bis ${suffix}`;
    const res = await request(app)
      .post('/api/products/with-category')
      .send({ name: `Produit bis ${suffix}`, price: 10, categoryName });
    expect(res.status).toBe(201);

    const [cats] = await pool.query('SELECT * FROM categories WHERE name = ?', [categoryName]);
    expect(cats).toHaveLength(1);
  });
});
