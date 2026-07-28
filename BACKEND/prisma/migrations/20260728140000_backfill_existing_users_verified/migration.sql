-- Cuentas creadas antes de que existiera la verificación de correo se
-- consideran ya "verificadas" (no hay forma de retroactivamente exigirles
-- el paso, y no tendría sentido mostrarles un aviso de "verificá tu correo"
-- de la nada). Solo los registros nuevos, de acá en adelante, empiezan en
-- `email_verified = false` (default declarado en el schema de Prisma).
UPDATE "users" SET "email_verified" = true;
