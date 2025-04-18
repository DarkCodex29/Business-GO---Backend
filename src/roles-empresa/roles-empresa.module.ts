import { Module } from '@nestjs/common';
import { RolesEmpresaService } from './roles-empresa.service';
import { RolesEmpresaController } from './roles-empresa.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RolesEmpresaController],
  providers: [RolesEmpresaService],
  exports: [RolesEmpresaService],
})
export class RolesEmpresaModule {}
