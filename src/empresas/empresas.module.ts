import { Module } from '@nestjs/common';
import { EmpresasController } from './controllers/empresas.controller';
import { EmpresasService } from './services/empresas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesEmpresaModule } from './modules/roles-empresa.module';

@Module({
  imports: [PrismaModule, RolesEmpresaModule],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
