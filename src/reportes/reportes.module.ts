import { Module } from '@nestjs/common';
import { ReportesController } from './controllers/reportes.controller';
import { ReportesService } from './services/reportes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
