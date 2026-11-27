-- Création de la base et des tables (on peut relancer le script sans erreur)
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS lab_product CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lab_product;

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category_id INT,
    CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;
