import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { PrismaService } from '../../prisma/prisma.service';
import { inicializarPermisos } from '../scripts/init-permisos';

@Injectable()
@Command({
  name: 'init-permisos',
  description: 'Inicializa los permisos básicos del sistema',
})
export class InitPermisosCommand extends CommandRunner {
  private readonly logger = new Logger(InitPermisosCommand.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async run(): Promise<void> {
    try {
      this.logger.log('Iniciando comando de inicialización de permisos...');
      await inicializarPermisos(this.prisma);
      this.logger.log('Inicialización de permisos completada exitosamente');
    } catch (error) {
      this.logger.error('Error al inicializar permisos:', error);
      process.exit(1);
    }
  }
}
