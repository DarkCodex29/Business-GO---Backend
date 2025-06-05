import { Module } from '@nestjs/common';
import { EmpresasController } from './controllers/empresas.controller';
import { ConfiguracionRegionalController } from './controllers/configuracion-regional.controller';
import { ConfiguracionImpuestosController } from './controllers/configuracion-impuestos.controller';
import { EmpresasService } from './services/empresas.service';
import { ConfiguracionRegionalService } from './services/configuracion-regional.service';
import { ConfiguracionImpuestosService } from './services/configuracion-impuestos.service';
import { ConfiguracionMonedaService } from './services/configuracion-moneda.service';
import { EmpresaValidationService } from './services/empresa-validation.service';

import { PrismaModule } from '../prisma/prisma.module';
import { RolesEmpresaModule } from '../roles-empresa/roles-empresa.module';

@Module({
  imports: [PrismaModule, RolesEmpresaModule],
  controllers: [
    EmpresasController,
    ConfiguracionRegionalController,
    ConfiguracionImpuestosController,
  ],
  providers: [
    EmpresasService,
    ConfiguracionRegionalService,
    ConfiguracionImpuestosService,
    ConfiguracionMonedaService,
    EmpresaValidationService,
  ],
  exports: [
    EmpresasService,
    ConfiguracionRegionalService,
    ConfiguracionImpuestosService,
    ConfiguracionMonedaService,
    EmpresaValidationService,
  ],
})
export class EmpresasModule {}
