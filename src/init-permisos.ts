import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InitPermisosCommand } from './auth/commands/init-permisos.command';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const command = app.get(InitPermisosCommand);
  await command.run();
  await app.close();
}

bootstrap();
