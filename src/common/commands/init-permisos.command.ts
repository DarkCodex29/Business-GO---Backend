import { Command, CommandRunner } from 'nest-commander';
import { PrismaService } from '../../prisma/prisma.service';
import { inicializarPermisos } from '../scripts/init-permisos';

@Command({
  name: 'init-permisos',
  description: 'Inicializa los permisos básicos del sistema',
})
export class InitPermisosCommand extends CommandRunner {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async run(): Promise<void> {
    try {
      await inicializarPermisos(this.prisma);
      console.log('Inicialización de permisos completada exitosamente');
    } catch (error) {
      console.error('Error al inicializar permisos:', error);
      process.exit(1);
    }
  }
}
