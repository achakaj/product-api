const request = require('supertest');
const app = require('../app');
const pool = require('../src/config/db');

const suffix = Date.now();
let catId;
let otherCatId;

async function createProduct(name, price, category_id) {
  const res = await request(app).post('/api/products').send({ name, price, category_id });
  if (res.status !== 201) throw new Error(`creation impossible : ${res.status}`);
  return res.body;
}

beforeAll(async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});

  // une categorie a nous pour isoler les resultats
  const cat = await request(app).post('/api/categories').send({ name: `Recherche ${suffix}` });
  catId = cat.body.id;
  await createProduct(`Lampe Zorblax ${suffix}`, 10, catId);
  await createProduct(`Bureau ${suffix}`, 50, catId);
  await createProduct(`Canape ${suffix}`, 120, catId);
  await createProduct(`Armoire ${suffix}`, 80, catId);

  // 12 produits pour tester la limite par defaut
  const other = await request(app).post('/api/categories').send({ name: `Defaut ${suffix}` });
  otherCatId = other.body.id;
  for (let i = 12; i >= 1; i--) {
    await createProduct(`Article ${String(i).padStart(2, '0')}`, i, otherCatId);
  }
});

afterAll(async () => {
  console.error.mockRestore();
  await pool.end();
});

describe('filtres de recherche', () => {
  test('filtre name insensible a la casse', async () => {
    const res = await request(app).get('/api/products/search').query({ name: 'zORBLAX' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe(`Lampe Zorblax ${suffix}`);
    expect(res.body[0].price).toBe(10);
  });

  test('filtre minPrice et maxPrice', async () => {
    const res = await request(app)
      .get('/api/products/search')
      .query({ categoryId: catId, minPrice: 20, maxPrice: 100, sort: 'price' });
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.price)).toEqual([50, 80]);
    res.body.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(20);
      expect(p.price).toBeLessThanOrEqual(100);
    });
  });

  test('filtre categoryId', async () => {
    const res = await request(app).get('/api/products/search').query({ categoryId: catId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    res.body.forEach((p) => expect(p.category_id).toBe(catId));
  });

  test('filtre sur une categorie de depart', async () => {
    const res = await request(app).get('/api/products/search').query({ categoryId: 1, name: 'Smartphone' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'Smartphone', price: 699.99, category_id: 1 }]);
  });

  test('tri par prix decroissant', async () => {
    const res = await request(app)
      .get('/api/products/search')
      .query({ categoryId: catId, sort: 'price', order: 'desc' });
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.price)).toEqual([120, 80, 50, 10]);
  });

  test('pagination : limit et offset donnent des pages differentes', async () => {
    const page1 = await request(app)
      .get('/api/products/search')
      .query({ categoryId: catId, sort: 'price', limit: 2, offset: 0 });
    const page2 = await request(app)
      .get('/api/products/search')
      .query({ categoryId: catId, sort: 'price', limit: 2, offset: 2 });

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    expect(page1.body.map((p) => p.price)).toEqual([10, 50]);
    expect(page2.body.map((p) => p.price)).toEqual([80, 120]);

    const ids1 = page1.body.map((p) => p.id);
    page2.body.forEach((p) => expect(ids1).not.toContain(p.id));
  });

  test('valeurs par defaut : 10 resultats tries par nom croissant', async () => {
    const res = await request(app).get('/api/products/search').query({ categoryId: otherCatId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    const expected = Array.from({ length: 10 }, (_, i) => `Article ${String(i + 1).padStart(2, '0')}`);
    expect(res.body.map((p) => p.name)).toEqual(expected);
  });

  test('sans aucun parametre : 200 avec au plus 10 produits', async () => {
    const res = await request(app).get('/api/products/search');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(10);
  });
});

describe('parametres invalides', () => {
  test('sort=password : 400', async () => {
    const res = await request(app).get('/api/products/search').query({ sort: 'password' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe('sort must be id, name, price or category_id');
  });

  test('limit=0 : 400', async () => {
    const res = await request(app).get('/api/products/search').query({ limit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe('limit must be between 1 and 100');
  });

  test('limit=101 : 400', async () => {
    const res = await request(app).get('/api/products/search').query({ limit: 101 });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe('limit must be between 1 and 100');
  });

  test('order=up : 400', async () => {
    const res = await request(app).get('/api/products/search').query({ order: 'up' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe('order must be asc or desc');
  });

  test('offset negatif : 400', async () => {
    const res = await request(app).get('/api/products/search').query({ offset: -1 });
    expect(res.status).toBe(400);
  });

  test('injection SQL dans name : 200 et tableau vide', async () => {
    const res = await request(app).get('/api/products/search').query({ name: "' OR 1=1 --" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    // la table est intacte
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM products');
    expect(rows[0].total).toBeGreaterThan(0);
  });
});
