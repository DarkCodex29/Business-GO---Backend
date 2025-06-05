import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { RolesValidationService } from './services/roles-validation.service';
import { RolesCalculationService } from './services/roles-calculation.service';
import { BaseRolesService } from './services/base-roles.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [
    RolesService,
    RolesValidationService,
    RolesCalculationService,
    BaseRolesService,
  ],
  exports: [
    RolesService,
    RolesValidationService,
    RolesCalculationService,
    BaseRolesService,
  ],
})
export class RolesModule {}
