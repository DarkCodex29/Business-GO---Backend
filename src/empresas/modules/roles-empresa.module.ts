import { Module } from '@nestjs/common';
import { RolesEmpresaController } from '../controllers/roles-empresa.controller';
import { RolesEmpresaService } from '../services/roles-empresa.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RolesEmpresaController],
  providers: [RolesEmpresaService],
  exports: [RolesEmpresaService],
})
export class RolesEmpresaModule {}
