import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { EmpresasModule } from './empresas/empresas.module';
import { FilesModule } from './files/files.module';
import { ProductsModule } from './productos/products.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    // Módulos de Infraestructura (no visibles en Swagger)
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EmailModule,

    // Módulos de la Aplicación (orden según menú)
    AuthModule, // 1. Autenticación
    RolesModule, // 2. Permisos
    UsersModule, // 3. Usuarios
    ClientsModule, // 4. Clientes
    EmpresasModule, // 5. Empresas
    FilesModule, // 6. Archivos
    ProductsModule, // 7. Productos (incluye Stock, Precios, etc.)
  ],
})
export class AppModule {}
