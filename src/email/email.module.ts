import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailValidationService } from './services/email-validation.service';
import { EmailCalculationService } from './services/email-calculation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [EmailController],
  providers: [EmailService, EmailValidationService, EmailCalculationService],
  exports: [EmailService, EmailValidationService, EmailCalculationService],
})
export class EmailModule {}
