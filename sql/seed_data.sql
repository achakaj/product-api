-- Données de test. INSERT IGNORE avec des id fixes : le script peut être relancé sans doublon.
SET NAMES utf8mb4;
USE lab_product;

INSERT IGNORE INTO categories (id, name) VALUES
    (1, 'Électronique'),
    (2, 'Livres'),
    (3, 'Vêtements');

INSERT IGNORE INTO products (id, name, price, category_id) VALUES
    (1, 'Smartphone', 699.99, 1),
    (2, 'Roman', 14.99, 2),
    (3, 'T-shirt', 19.99, 3);
