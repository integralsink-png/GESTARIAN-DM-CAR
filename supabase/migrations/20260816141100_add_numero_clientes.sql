ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero INTEGER;

-- Popula la columna numero de forma correlativa para los clientes existentes
WITH RankedClientes AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
    FROM clientes
)
UPDATE clientes
SET numero = RankedClientes.row_num
FROM RankedClientes
WHERE clientes.id = RankedClientes.id AND clientes.numero IS NULL;
