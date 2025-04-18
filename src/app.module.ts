import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { RolesEmpresaModule } from './roles-empresa/roles-empresa.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { EmpresasModule } from './empresas/empresas.module';
import { FilesModule } from './files/files.module';
import { ProductsModule } from './productos/products.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { VentasModule } from './ventas/ventas.module';

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
    RolesEmpresaModule, // 2.1 Roles de Empresa
    UsersModule, // 3. Usuarios
    ClientsModule, // 4. Clientes
    EmpresasModule, // 5. Empresas
    FilesModule, // 6. Archivos
    ProductsModule, // 7. Productos (incluye Stock, Precios, etc.)
    VentasModule, // 8. Ventas y Facturación
  ],
})
export class AppModule {}
