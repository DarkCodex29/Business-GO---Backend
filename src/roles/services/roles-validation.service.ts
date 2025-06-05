import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRolDto } from '../dto/create-rol.dto';
import { UpdateRolDto } from '../dto/update-rol.dto';
import { AsignarPermisosDto } from '../dto/asignar-permisos.dto';

@Injectable()
export class RolesValidationService {
  constructor(private readonly prisma: PrismaService) {}

  // Validaciones para creación de roles
  validateCreateRolData(createRolDto: CreateRolDto): void {
    this.validateNombreRol(createRolDto.nombre);
    this.validateDescripcionRol(createRolDto.descripcion);

    if (createRolDto.rol_padre_id) {
      this.validateRolPadreId(createRolDto.rol_padre_id);
    }
  }

  // Validaciones para actualización de roles
  validateUpdateRolData(updateRolDto: UpdateRolDto): void {
    if (updateRolDto.nombre) {
      this.validateNombreRol(updateRolDto.nombre);
    }

    if (updateRolDto.descripcion) {
      this.validateDescripcionRol(updateRolDto.descripcion);
    }

    if (updateRolDto.rol_padre_id) {
      this.validateRolPadreId(updateRolDto.rol_padre_id);
    }
  }

  // Validaciones para asignación de permisos
  validateAsignarPermisosData(asignarPermisosDto: AsignarPermisosDto): void {
    if (
      !asignarPermisosDto.permisoIds ||
      asignarPermisosDto.permisoIds.length === 0
    ) {
      throw new BadRequestException('Debe proporcionar al menos un permiso');
    }

    // Validar que no haya IDs duplicados
    const uniqueIds = new Set(asignarPermisosDto.permisoIds);
    if (uniqueIds.size !== asignarPermisosDto.permisoIds.length) {
      throw new BadRequestException('No se permiten permisos duplicados');
    }

    // Validar que todos los IDs sean números positivos
    asignarPermisosDto.permisoIds.forEach((id) => {
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException(`ID de permiso inválido: ${id}`);
      }
    });
  }

  // Validaciones específicas de campos
  private validateNombreRol(nombre: string): void {
    if (!nombre || typeof nombre !== 'string') {
      throw new BadRequestException('El nombre del rol es requerido');
    }

    if (nombre.trim().length === 0) {
      throw new BadRequestException('El nombre del rol no puede estar vacío');
    }

    if (nombre.length < 3) {
      throw new BadRequestException(
        'El nombre del rol debe tener al menos 3 caracteres',
      );
    }

    if (nombre.length > 50) {
      throw new BadRequestException(
        'El nombre del rol no puede exceder 50 caracteres',
      );
    }

    // Validar caracteres permitidos (letras, números, espacios, guiones)
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-_]+$/;
    if (!nombreRegex.test(nombre)) {
      throw new BadRequestException(
        'El nombre del rol solo puede contener letras, números, espacios, guiones y guiones bajos',
      );
    }

    // Validar que no sea solo espacios
    if (nombre.trim() !== nombre) {
      throw new BadRequestException(
        'El nombre del rol no puede empezar o terminar con espacios',
      );
    }
  }

  private validateDescripcionRol(descripcion?: string): void {
    if (descripcion !== undefined && descripcion !== null) {
      if (typeof descripcion !== 'string') {
        throw new BadRequestException(
          'La descripción debe ser una cadena de texto',
        );
      }

      if (descripcion.length > 500) {
        throw new BadRequestException(
          'La descripción no puede exceder 500 caracteres',
        );
      }
    }
  }

  private validateRolPadreId(rolPadreId: number): void {
    if (!Number.isInteger(rolPadreId) || rolPadreId <= 0) {
      throw new BadRequestException(
        'El ID del rol padre debe ser un número entero positivo',
      );
    }
  }

  // Validaciones de existencia en base de datos
  async validateRolExists(rolId: number): Promise<void> {
    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: rolId },
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${rolId} no encontrado`);
    }
  }

  async validateRolPadreExists(rolPadreId: number): Promise<void> {
    const rolPadre = await this.prisma.rol.findUnique({
      where: { id_rol: rolPadreId },
    });

    if (!rolPadre) {
      throw new NotFoundException(
        `Rol padre con ID ${rolPadreId} no encontrado`,
      );
    }
  }

  async validateUniqueNombreRol(
    nombre: string,
    excludeId?: number,
  ): Promise<void> {
    const whereClause: any = { nombre: nombre.trim() };

    if (excludeId) {
      whereClause.id_rol = { not: excludeId };
    }

    const rolExistente = await this.prisma.rol.findFirst({
      where: whereClause,
    });

    if (rolExistente) {
      throw new ConflictException(`Ya existe un rol con el nombre "${nombre}"`);
    }
  }

  async validatePermisosExist(permisoIds: number[]): Promise<void> {
    const permisos = await this.prisma.permiso.findMany({
      where: {
        id_permiso: { in: permisoIds },
      },
      select: { id_permiso: true },
    });

    const permisosEncontrados = permisos.map((p) => p.id_permiso);
    const permisosNoEncontrados = permisoIds.filter(
      (id) => !permisosEncontrados.includes(id),
    );

    if (permisosNoEncontrados.length > 0) {
      throw new NotFoundException(
        `Permisos no encontrados: ${permisosNoEncontrados.join(', ')}`,
      );
    }
  }

  async validateRolCanBeDeleted(rolId: number): Promise<void> {
    // Verificar que el rol no tenga usuarios asignados
    const usuariosConRol = await this.prisma.usuario.count({
      where: { rol_id: rolId },
    });

    if (usuariosConRol > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rol porque tiene ${usuariosConRol} usuario(s) asignado(s)`,
      );
    }

    // Verificar que no sea rol padre de otros roles
    const rolesHijos = await this.prisma.rol.count({
      where: { rol_padre_id: rolId },
    });

    if (rolesHijos > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rol porque es padre de ${rolesHijos} rol(es)`,
      );
    }
  }

  async validatePermisoRolExists(
    rolId: number,
    permisoId: number,
  ): Promise<void> {
    const permisoRol = await this.prisma.permisoRol.findFirst({
      where: {
        rol_id: rolId,
        permiso_id: permisoId,
      },
    });

    if (!permisoRol) {
      throw new NotFoundException(
        `El permiso ${permisoId} no está asignado al rol ${rolId}`,
      );
    }
  }

  // Validaciones de jerarquía de roles
  async validateRolHierarchy(rolId: number, rolPadreId: number): Promise<void> {
    // Evitar referencias circulares
    if (rolId === rolPadreId) {
      throw new BadRequestException('Un rol no puede ser padre de sí mismo');
    }

    // Verificar que no se cree una referencia circular
    await this.checkCircularReference(rolId, rolPadreId);
  }

  private async checkCircularReference(
    rolId: number,
    rolPadreId: number,
  ): Promise<void> {
    let currentRolId = rolPadreId;
    const visitedRoles = new Set<number>();

    while (currentRolId) {
      if (visitedRoles.has(currentRolId)) {
        throw new BadRequestException(
          'Se detectó una referencia circular en la jerarquía de roles',
        );
      }

      if (currentRolId === rolId) {
        throw new BadRequestException(
          'La asignación crearía una referencia circular',
        );
      }

      visitedRoles.add(currentRolId);

      const parentRol = await this.prisma.rol.findUnique({
        where: { id_rol: currentRolId },
        select: { rol_padre_id: true },
      });

      currentRolId = parentRol?.rol_padre_id ?? 0;
      if (currentRolId === 0) break;
    }
  }

  // Validaciones específicas para contexto peruano
  validateRolContextoPeruano(nombre: string): void {
    // Lista de roles reservados para el sistema
    const rolesReservados = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'PLATFORM_ADMIN'];

    if (rolesReservados.includes(nombre.toUpperCase())) {
      throw new BadRequestException(
        `El nombre "${nombre}" está reservado para el sistema`,
      );
    }

    // Validar nombres apropiados para contexto empresarial peruano
    const nombresInapropiados = ['ROOT', 'SUDO', 'ADMINISTRATOR'];

    if (nombresInapropiados.includes(nombre.toUpperCase())) {
      throw new BadRequestException(
        `El nombre "${nombre}" no es apropiado para roles empresariales`,
      );
    }
  }

  // Validaciones de límites del sistema
  async validateSystemLimits(): Promise<void> {
    const totalRoles = await this.prisma.rol.count();
    const MAX_ROLES = 100; // Límite máximo de roles en el sistema

    if (totalRoles >= MAX_ROLES) {
      throw new BadRequestException(
        `Se ha alcanzado el límite máximo de ${MAX_ROLES} roles en el sistema`,
      );
    }
  }
}
