import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

export interface EmpresarioInfo {
  id_usuario: number;
  nombre: string;
  telefono: string;
  email: string;
  empresas: {
    id_empresa: number;
    nombre: string;
    cargo: string;
    es_dueno: boolean;
    permisos: string[];
    telefono_empresa?: string;
    email_empresa?: string;
  }[];
}

/**
 * 🎯 SERVICIO SIMPLIFICADO PARA IDENTIFICACIÓN AUTOMÁTICA
 * Enfoque: Solo identificar si es empresario registrado por número de teléfono
 */
@Injectable()
export class EvolutionBusinessQueryService {
  private readonly logger = new Logger(EvolutionBusinessQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🔍 IDENTIFICAR AUTOMÁTICAMENTE SI ES EMPRESARIO REGISTRADO
   * Esta es la función CLAVE que usa el webhook para decidir el flujo
   */
  async identificarEmpresario(
    phoneNumber: string,
  ): Promise<EmpresarioInfo | null> {
    // Formatear número para búsqueda consistente
    const numeroFormateado = this.formatPhoneNumber(phoneNumber);

    try {
      // Buscar usuario por teléfono en BD usando ambos formatos
      const usuario = await this.prisma.usuario.findFirst({
        where: {
          telefono: {
            in: [phoneNumber, numeroFormateado],
          },
          activo: true,
        },
        include: {
          empresas: {
            where: {
              estado: 'activo',
            },
            include: {
              empresa: {
                select: {
                  id_empresa: true,
                  nombre: true,
                  telefono: true,
                },
              },
            },
          },
        },
      });

      if (!usuario || usuario.empresas.length === 0) {
        // ❌ NO es empresario registrado
        this.logger.log(`❌ NO empresario: ${phoneNumber}`);
        return null;
      }

      // ✅ ES EMPRESARIO - Construir información básica
      const empresarioInfo: EmpresarioInfo = {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        telefono: usuario.telefono || phoneNumber,
        email: usuario.email,
        empresas: usuario.empresas.map((ue) => ({
          id_empresa: ue.empresa.id_empresa,
          nombre: ue.empresa.nombre,
          cargo: ue.cargo || 'Empleado',
          es_dueno: ue.es_dueno,
          permisos: ['read'], // Permisos básicos por defecto
          telefono_empresa: ue.empresa.telefono || undefined,
        })),
      };

      this.logger.log(
        `✅ EMPRESARIO IDENTIFICADO: ${usuario.nombre} con ${empresarioInfo.empresas.length} empresa(s)`,
      );
      return empresarioInfo;
    } catch (error) {
      this.logger.error('Error identificando empresario:', error);
      return null;
    }
  }

  /**
   * Formatear número de teléfono para consistencia en búsquedas
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Limpiar número
    let numero = phoneNumber.replace(/\D/g, '');

    // Si empieza con 51 (código Perú), mantener
    if (numero.startsWith('51') && numero.length === 11) {
      return `+${numero}`;
    }

    // Si es número local peruano (9 dígitos), agregar +51
    if (numero.length === 9) {
      return `+51${numero}`;
    }

    // Si no tiene +, agregarlo
    if (!phoneNumber.startsWith('+')) {
      return `+${numero}`;
    }

    return phoneNumber;
  }

  /**
   * 🏢 Obtener información básica de la empresa para n8n
   */
  async obtenerInfoEmpresa(empresaId: number): Promise<any> {
    try {
      const empresa = await this.prisma.empresa.findUnique({
        where: { id_empresa: empresaId },
        select: {
          id_empresa: true,
          nombre: true,
          telefono: true,
        },
      });

      return empresa;
    } catch (error) {
      this.logger.error('Error obteniendo info empresa:', error);
      return null;
    }
  }

  /**
   * 📊 Obtener métricas básicas para contexto empresarial
   */
  async obtenerMetricasBasicas(empresaId: number): Promise<any> {
    try {
      const [productos, empleados] = await Promise.all([
        this.prisma.productoServicio.count({
          where: { id_empresa: empresaId },
        }),
        this.prisma.usuarioEmpresa.count({
          where: {
            empresa_id: empresaId,
            estado: 'activo',
          },
        }),
      ]);

      return {
        total_productos: productos,
        total_empleados: empleados,
        fecha_consulta: new Date(),
      };
    } catch (error) {
      this.logger.error('Error obteniendo métricas:', error);
      return {
        total_productos: 0,
        total_empleados: 0,
        fecha_consulta: new Date(),
      };
    }
  }
}
