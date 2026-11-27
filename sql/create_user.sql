-- Utilisateur dédié à l'application (à lancer avec le compte root).
-- Le lab donne GRANT ALL ON *.* ; ici on limite les droits aux bases du projet.
-- Avec MySQL dans Docker, l'application ne vient pas de "localhost" : on utilise l'hôte '%'.
-- Sur un MySQL installé en local, remplacer '%' par 'localhost'.
CREATE USER IF NOT EXISTS 'lab_user'@'%' IDENTIFIED BY 'LabPass123!';
GRANT ALL PRIVILEGES ON lab_product.* TO 'lab_user'@'%';
-- base utilisée par les tests Jest
GRANT ALL PRIVILEGES ON lab_product_test.* TO 'lab_user'@'%';
FLUSH PRIVILEGES;
