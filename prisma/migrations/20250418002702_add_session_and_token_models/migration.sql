-- CreateTable
CREATE TABLE "SesionUsuario" (
    "id_sesion" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "dispositivo" TEXT,
    "ip_address" TEXT,
    "ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SesionUsuario_pkey" PRIMARY KEY ("id_sesion")
);

-- CreateTable
CREATE TABLE "TokenRevocado" (
    "id_token" BIGSERIAL NOT NULL,
    "token_jti" TEXT NOT NULL,
    "fecha_revocacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "razon" TEXT,
    "id_usuario" BIGINT NOT NULL,

    CONSTRAINT "TokenRevocado_pkey" PRIMARY KEY ("id_token")
);

-- CreateIndex
CREATE UNIQUE INDEX "SesionUsuario_token_key" ON "SesionUsuario"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRevocado_token_jti_key" ON "TokenRevocado"("token_jti");

-- AddForeignKey
ALTER TABLE "SesionUsuario" ADD CONSTRAINT "SesionUsuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenRevocado" ADD CONSTRAINT "TokenRevocado_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
