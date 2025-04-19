import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { ProductosModule } from './productos/products.module';
import { ClientesModule } from './clients/clients.module';
import { EmpresasModule } from './empresas/empresas.module';
import { ArchivosModule } from './archivos/archivos.module';
import { VentasModule } from './ventas/ventas.module';
import { RolesModule } from './roles/roles.module';
import { ReportesModule } from './reportes/reportes.module';
import { ValoracionesModule } from './valoraciones/valoraciones.module';
import { InventarioModule } from './inventario/inventario.module';
import { ComprasModule } from './compras/compras.module';

@Module({
  imports: [
    // Módulos de Infraestructura (no visibles en Swagger)
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    EmailModule,
    ProductosModule,
    ClientesModule,
    EmpresasModule,
    ArchivosModule,
    VentasModule,
    RolesModule,
    ReportesModule,
    ValoracionesModule,
    InventarioModule,
    ComprasModule,
  ],
})
export class AppModule {}
