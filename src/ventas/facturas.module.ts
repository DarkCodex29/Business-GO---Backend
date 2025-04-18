import { Module } from '@nestjs/common';
import { FacturasService } from './services/facturas.service';
import { FacturasController } from './controllers/facturas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FacturasController],
  providers: [FacturasService],
  exports: [FacturasService],
})
export class FacturasModule {}
