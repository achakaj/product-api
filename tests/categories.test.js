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

describe('CRUD categories', () => {
  test('liste des categories : contient les categories de depart', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([
      { id: 1, name: 'Électronique' },
      { id: 2, name: 'Livres' },
      { id: 3, name: 'Vêtements' }
    ]));
  });

  test('lecture d\'une categorie de depart', async () => {
    const res = await request(app).get('/api/categories/2');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 2, name: 'Livres' });
  });

  test('creation, lecture, mise a jour puis suppression d\'une categorie', async () => {
    const name = `Jardin ${suffix}`;
    const created = await request(app).post('/api/categories').send({ name });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: expect.any(Number), name });
    const id = created.body.id;

    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    expect(rows[0]).toMatchObject({ name });

    const read = await request(app).get(`/api/categories/${id}`);
    expect(read.status).toBe(200);
    expect(read.body).toEqual({ id, name });

    const newName = `Jardinage ${suffix}`;
    const updated = await request(app).put(`/api/categories/${id}`).send({ name: newName });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ id, name: newName });

    const [after] = await pool.query('SELECT name FROM categories WHERE id = ?', [id]);
    expect(after[0].name).toBe(newName);

    const deleted = await request(app).delete(`/api/categories/${id}`);
    expect(deleted.status).toBe(204);

    const again = await request(app).get(`/api/categories/${id}`);
    expect(again.status).toBe(404);
    expect(again.body).toEqual({ error: 'Category not found' });
  });
});

describe('erreurs sur les categories', () => {
  test('nom trop court : 400', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.msg)).toContain('Category name too short');
  });

  test('nom absent : 400', async () => {
    const res = await request(app).post('/api/categories').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.msg)).toContain('Category name too short');
  });

  test('creation d\'un doublon : 409', async () => {
    const name = `Sport ${suffix}`;
    const first = await request(app).post('/api/categories').send({ name });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/categories').send({ name });
    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: 'Category name already exists' });

    const [rows] = await pool.query('SELECT * FROM categories WHERE name = ?', [name]);
    expect(rows).toHaveLength(1);
  });

  test('modification vers un nom deja pris : 409', async () => {
    const a = await request(app).post('/api/categories').send({ name: `Musique ${suffix}` });
    const b = await request(app).post('/api/categories').send({ name: `Cinema ${suffix}` });

    const res = await request(app).put(`/api/categories/${b.body.id}`).send({ name: `Musique ${suffix}` });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Category name already exists' });

    const [rows] = await pool.query('SELECT name FROM categories WHERE id = ?', [b.body.id]);
    expect(rows[0].name).toBe(`Cinema ${suffix}`);
    expect(a.status).toBe(201);
  });

  test('GET, PUT et DELETE d\'une categorie inexistante : 404', async () => {
    const get = await request(app).get('/api/categories/999999');
    expect(get.status).toBe(404);
    expect(get.body).toEqual({ error: 'Category not found' });

    const put = await request(app).put('/api/categories/999999').send({ name: 'Inconnue' });
    expect(put.status).toBe(404);
    expect(put.body).toEqual({ error: 'Category not found' });

    const del = await request(app).delete('/api/categories/999999');
    expect(del.status).toBe(404);
    expect(del.body).toEqual({ error: 'Category not found' });
  });

  test('id invalide : 400', async () => {
    const res = await request(app).get('/api/categories/abc');
    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe('id must be a positive integer');
  });
});

describe('suppression d\'une categorie liee a des produits', () => {
  test('refusee (400) tant qu\'un produit est lie, acceptee ensuite', async () => {
    const cat = await request(app).post('/api/categories').send({ name: `Cuisine ${suffix}` });
    const catId = cat.body.id;
    const prod = await request(app)
      .post('/api/products')
      .send({ name: `Casserole ${suffix}`, price: 25, category_id: catId });
    expect(prod.status).toBe(201);

    const refused = await request(app).delete(`/api/categories/${catId}`);
    expect(refused.status).toBe(400);
    expect(refused.body).toEqual({ error: 'Cannot delete category with linked products' });

    // la categorie doit toujours etre en base
    const [still] = await pool.query('SELECT * FROM categories WHERE id = ?', [catId]);
    expect(still).toHaveLength(1);

    const delProd = await request(app).delete(`/api/products/${prod.body.id}`);
    expect(delProd.status).toBe(204);

    const accepted = await request(app).delete(`/api/categories/${catId}`);
    expect(accepted.status).toBe(204);

    const [gone] = await pool.query('SELECT * FROM categories WHERE id = ?', [catId]);
    expect(gone).toHaveLength(0);
  });
});
