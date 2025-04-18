import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { EmpresasModule } from './empresas/empresas.module';
import { FilesModule } from './files/files.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './productos/products.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    // Módulos de Infraestructura
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EmailModule,
    PrismaModule,

    // Módulos de la Aplicación (orden alfabético)
    AuthModule, // Autenticación
    ClientsModule, // Clientes
    EmpresasModule, // Empresas
    FilesModule, // Archivos
    ProductsModule, // Productos
    RolesModule, // Roles
    UsersModule, // Usuarios
  ],
})
export class AppModule {}
