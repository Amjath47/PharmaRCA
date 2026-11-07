USE aivoa_rca;
SHOW TABLES;
SELECT COUNT(*) AS total_deviations FROM deviations;
SELECT COUNT(*) AS total_investigations FROM investigations;
SELECT COUNT(*) AS total_capas FROM capas;
START TRANSACTION;
SET SQL_SAFE_UPDATES = 0; #To disable the safe update mode while deleting
DELETE FROM capas;
DELETE FROM investigations;
DELETE FROM deviations;
COMMIT;
SET SQL_SAFE_UPDATES = 1; #Reactivating the safe update mode