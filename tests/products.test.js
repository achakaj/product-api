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

describe('CRUD produits', () => {
  test('liste des produits : 200 avec un tableau et des prix en nombre', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const smartphone = res.body.find((p) => p.id === 1);
    expect(smartphone).toEqual({ id: 1, name: 'Smartphone', price: 699.99, category_id: 1 });
    res.body.forEach((p) => expect(typeof p.price).toBe('number'));
  });

  test('creation, lecture, mise a jour puis suppression d\'un produit', async () => {
    const name = `Clavier ${suffix}`;
    const created = await request(app)
      .post('/api/products')
      .send({ name, price: 49.9, category_id: 1 });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: expect.any(Number), name, price: 49.9, category_id: 1 });
    const id = created.body.id;

    // verification directe en base
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name, price: 49.9, category_id: 1 });

    const read = await request(app).get(`/api/products/${id}`);
    expect(read.status).toBe(200);
    expect(read.body).toEqual({ id, name, price: 49.9, category_id: 1 });
    expect(typeof read.body.price).toBe('number');

    const newName = `Clavier RGB ${suffix}`;
    const updated = await request(app)
      .put(`/api/products/${id}`)
      .send({ name: newName, price: 59.5, category_id: 2 });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ id, name: newName, price: 59.5, category_id: 2 });

    const [after] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    expect(after[0]).toMatchObject({ name: newName, price: 59.5, category_id: 2 });

    const deleted = await request(app).delete(`/api/products/${id}`);
    expect(deleted.status).toBe(204);
    expect(deleted.body).toEqual({});

    const again = await request(app).get(`/api/products/${id}`);
    expect(again.status).toBe(404);
    expect(again.body).toEqual({ error: 'Product not found' });

    const [gone] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    expect(gone).toHaveLength(0);
  });

  test('creation sans category_id : category_id vaut null', async () => {
    const name = `Stylo ${suffix}`;
    const res = await request(app).post('/api/products').send({ name, price: 2.5 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), name, price: 2.5, category_id: null });

    const [rows] = await pool.query('SELECT category_id FROM products WHERE id = ?', [res.body.id]);
    expect(rows[0].category_id).toBeNull();
  });

  test('le prix envoye en chaine est renvoye en nombre', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: `Cahier ${suffix}`, price: '3.75', category_id: 2 });
    expect(res.status).toBe(201);
    expect(res.body.price).toBe(3.75);

    const read = await request(app).get(`/api/products/${res.body.id}`);
    expect(read.body.price).toBe(3.75);
  });
});

describe('validation des produits', () => {
  test('nom trop court : 400', async () => {
    const res = await request(app).post('/api/products').send({ name: 'ab', price: 10 });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.msg)).toContain('Name must be at least 3 chars');
  });

  test('prix a 0 : 400', async () => {
    const res = await request(app).post('/api/products').send({ name: `Gratuit ${suffix}`, price: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.msg)).toContain('Price must be positive');
  });

  test('prix negatif : 400', async () => {
    const res = await request(app).post('/api/products').send({ name: `Negatif ${suffix}`, price: -5 });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.msg)).toContain('Price must be positive');
  });

  test('category_id "x" : 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: `Lettre ${suffix}`, price: 5, category_id: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.msg)).toContain('category_id must be a positive integer');
  });

  test('category_id inexistant : 400 Invalid category_id et rien en base', async () => {
    const name = `Fantome ${suffix}`;
    const res = await request(app).post('/api/products').send({ name, price: 5, category_id: 999999 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid category_id' });

    const [rows] = await pool.query('SELECT * FROM products WHERE name = ?', [name]);
    expect(rows).toHaveLength(0);
  });

  test('PUT avec un corps invalide : 400', async () => {
    const res = await request(app).put('/api/products/1').send({ name: 'ab', price: -1 });
    expect(res.status).toBe(400);
    const msgs = res.body.errors.map((e) => e.msg);
    expect(msgs).toContain('Name must be at least 3 chars');
    expect(msgs).toContain('Price must be positive');
  });

  test('PUT avec un category_id inexistant : 400', async () => {
    const created = await request(app).post('/api/products').send({ name: `Agenda ${suffix}`, price: 8 });
    const res = await request(app)
      .put(`/api/products/${created.body.id}`)
      .send({ name: `Agenda ${suffix}`, price: 8, category_id: 999999 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid category_id' });
  });
});

describe('produit introuvable ou id invalide', () => {
  test('GET d\'un id inexistant : 404', async () => {
    const res = await request(app).get('/api/products/999999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });

  test('PUT d\'un id inexistant : 404', async () => {
    const res = await request(app).put('/api/products/999999').send({ name: 'Inconnu', price: 10 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });

  test('DELETE d\'un id inexistant : 404', async () => {
    const res = await request(app).delete('/api/products/999999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });

  test('id "abc" : 400 sur GET, PUT et DELETE', async () => {
    const expected = expect.arrayContaining([expect.objectContaining({ msg: 'id must be a positive integer' })]);

    const get = await request(app).get('/api/products/abc');
    expect(get.status).toBe(400);
    expect(get.body.errors).toEqual(expected);

    const put = await request(app).put('/api/products/abc').send({ name: 'Valide', price: 10 });
    expect(put.status).toBe(400);
    expect(put.body.errors).toEqual(expected);

    const del = await request(app).delete('/api/products/abc');
    expect(del.status).toBe(400);
    expect(del.body.errors).toEqual(expected);
  });

  test('route inconnue : 404 Route not found', async () => {
    const res = await request(app).get('/api/inconnue');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });
});
