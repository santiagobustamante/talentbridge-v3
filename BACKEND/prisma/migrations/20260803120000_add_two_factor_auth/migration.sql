-- Fase 17 (panel administrativo): 2FA por TOTP para cuentas ADMIN.
ALTER TABLE "users" ADD COLUMN "two_factor_secret" TEXT;
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
