import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesValidationService } from './roles-validation.service';
import { CreateRolDto } from '../dto/create-rol.dto';
import { UpdateRolDto } from '../dto/update-rol.dto';

@Injectable()
export class BaseRolesService {
  protected readonly logger = new Logger(BaseRolesService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: RolesValidationService,
  ) {}

  // Template Method para crear rol
  async createRolTemplate(createRolDto: CreateRolDto) {
    this.logger.log(`Iniciando creación de rol: ${createRolDto.nombre}`);

    // 1. Validaciones previas
    await this.preCreateValidations(createRolDto);

    // 2. Preparar datos
    const rolData = await this.prepareCreateData(createRolDto);

    // 3. Crear rol
    const rol = await this.executeCreate(rolData);

    // 4. Post-procesamiento
    const processedRol = await this.postCreateProcessing(rol);

    this.logger.log(
      `Rol creado exitosamente: ${rol.nombre} (ID: ${rol.id_rol})`,
    );
    return processedRol;
  }

  // Template Method para actualizar rol
  async updateRolTemplate(id: number, updateRolDto: UpdateRolDto) {
    this.logger.log(`Iniciando actualización de rol ID: ${id}`);

    // 1. Validaciones previas
    await this.preUpdateValidations(id, updateRolDto);

    // 2. Preparar datos
    const rolData = await this.prepareUpdateData(id, updateRolDto);

    // 3. Actualizar rol
    const rol = await this.executeUpdate(id, rolData);

    // 4. Post-procesamiento
    const processedRol = await this.postUpdateProcessing(rol);

    this.logger.log(
      `Rol actualizado exitosamente: ${rol.nombre} (ID: ${rol.id_rol})`,
    );
    return processedRol;
  }

  // Template Method para eliminar rol
  async deleteRolTemplate(id: number) {
    this.logger.log(`Iniciando eliminación de rol ID: ${id}`);

    // 1. Validaciones previas
    await this.preDeleteValidations(id);

    // 2. Obtener datos antes de eliminar
    const rolData = await this.getBeforeDelete(id);

    // 3. Eliminar rol
    await this.executeDelete(id);

    // 4. Post-procesamiento
    await this.postDeleteProcessing(rolData);

    this.logger.log(`Rol eliminado exitosamente: ID ${id}`);
    return { message: 'Rol eliminado exitosamente' };
  }

  // Template Method para buscar roles
  async findRolesTemplate(filters?: any) {
    this.logger.log('Iniciando búsqueda de roles');

    // 1. Preparar filtros
    const preparedFilters = await this.prepareSearchFilters(filters);

    // 2. Ejecutar búsqueda
    const roles = await this.executeSearch(preparedFilters);

    // 3. Post-procesamiento
    const processedRoles = await this.postSearchProcessing(roles);

    this.logger.log(`Búsqueda completada: ${roles.length} roles encontrados`);
    return processedRoles;
  }

  // Métodos de validación (pueden ser sobrescritos)
  protected async preCreateValidations(
    createRolDto: CreateRolDto,
  ): Promise<void> {
    // Validaciones básicas
    this.validationService.validateCreateRolData(createRolDto);
    this.validationService.validateRolContextoPeruano(createRolDto.nombre);

    // Validaciones de base de datos
    await this.validationService.validateUniqueNombreRol(createRolDto.nombre);
    await this.validationService.validateSystemLimits();

    if (createRolDto.rol_padre_id) {
      await this.validationService.validateRolPadreExists(
        createRolDto.rol_padre_id,
      );
    }
  }

  protected async preUpdateValidations(
    id: number,
    updateRolDto: UpdateRolDto,
  ): Promise<void> {
    // Validar que el rol existe
    await this.validationService.validateRolExists(id);

    // Validaciones de datos
    this.validationService.validateUpdateRolData(updateRolDto);

    if (updateRolDto.nombre) {
      this.validationService.validateRolContextoPeruano(updateRolDto.nombre);
      await this.validationService.validateUniqueNombreRol(
        updateRolDto.nombre,
        id,
      );
    }

    if (updateRolDto.rol_padre_id) {
      await this.validationService.validateRolPadreExists(
        updateRolDto.rol_padre_id,
      );
      await this.validationService.validateRolHierarchy(
        id,
        updateRolDto.rol_padre_id,
      );
    }
  }

  protected async preDeleteValidations(id: number): Promise<void> {
    await this.validationService.validateRolExists(id);
    await this.validationService.validateRolCanBeDeleted(id);
  }

  // Métodos de preparación de datos (pueden ser sobrescritos)
  protected async prepareCreateData(createRolDto: CreateRolDto): Promise<any> {
    return {
      nombre: createRolDto.nombre.trim(),
      descripcion: createRolDto.descripcion?.trim() || null,
      rol_padre_id: createRolDto.rol_padre_id || null,
    };
  }

  protected async prepareUpdateData(
    id: number,
    updateRolDto: UpdateRolDto,
  ): Promise<any> {
    const updateData: any = {};

    if (updateRolDto.nombre !== undefined) {
      updateData.nombre = updateRolDto.nombre.trim();
    }

    if (updateRolDto.descripcion !== undefined) {
      updateData.descripcion = updateRolDto.descripcion?.trim() || null;
    }

    if (updateRolDto.rol_padre_id !== undefined) {
      updateData.rol_padre_id = updateRolDto.rol_padre_id;
    }

    return updateData;
  }

  protected async prepareSearchFilters(filters?: any): Promise<any> {
    const whereClause: any = {};

    if (filters?.nombre) {
      whereClause.nombre = {
        contains: filters.nombre,
        mode: 'insensitive',
      };
    }

    if (filters?.descripcion) {
      whereClause.descripcion = {
        contains: filters.descripcion,
        mode: 'insensitive',
      };
    }

    if (filters?.rol_padre_id !== undefined) {
      whereClause.rol_padre_id = filters.rol_padre_id;
    }

    if (filters?.soloRolesRaiz === true) {
      whereClause.rol_padre_id = null;
    }

    if (filters?.soloRolesHoja === true) {
      whereClause.other_Rol = {
        none: {},
      };
    }

    return {
      where: whereClause,
      include: this.getDefaultIncludes(),
      orderBy: this.getDefaultOrderBy(),
    };
  }

  // Métodos de ejecución (pueden ser sobrescritos)
  protected async executeCreate(rolData: any) {
    return this.prisma.rol.create({
      data: rolData,
      include: this.getDefaultIncludes(),
    });
  }

  protected async executeUpdate(id: number, rolData: any) {
    return this.prisma.rol.update({
      where: { id_rol: id },
      data: rolData,
      include: this.getDefaultIncludes(),
    });
  }

  protected async executeDelete(id: number) {
    // Primero eliminar permisos asociados
    await this.prisma.permisoRol.deleteMany({
      where: { rol_id: id },
    });

    // Luego eliminar el rol
    return this.prisma.rol.delete({
      where: { id_rol: id },
    });
  }

  protected async executeSearch(searchParams: any) {
    return this.prisma.rol.findMany(searchParams);
  }

  protected async getBeforeDelete(id: number) {
    return this.prisma.rol.findUnique({
      where: { id_rol: id },
      include: {
        usuario: true,
        permisoRol: true,
        other_Rol: true,
      },
    });
  }

  // Métodos de post-procesamiento (pueden ser sobrescritos)
  protected async postCreateProcessing(rol: any) {
    return this.formatRolResponse(rol);
  }

  protected async postUpdateProcessing(rol: any) {
    return this.formatRolResponse(rol);
  }

  protected async postDeleteProcessing(rolData: any): Promise<void> {
    // Log de auditoría
    this.logger.log(
      `Rol eliminado: ${rolData?.nombre} tenía ${rolData?.usuario?.length || 0} usuarios`,
    );
  }

  protected async postSearchProcessing(roles: any[]) {
    return roles.map((rol) => this.formatRolResponse(rol));
  }

  // Métodos de utilidad (pueden ser sobrescritos)
  protected getDefaultIncludes() {
    return {
      usuario: {
        select: {
          id_usuario: true,
          nombre: true,
          email: true,
        },
      },
      permisoRol: {
        include: {
          permiso: {
            select: {
              id_permiso: true,
              nombre: true,
              descripcion: true,
            },
          },
        },
      },
      rol: {
        select: {
          id_rol: true,
          nombre: true,
        },
      },
      other_Rol: {
        select: {
          id_rol: true,
          nombre: true,
          descripcion: true,
        },
      },
    };
  }

  protected getDefaultOrderBy() {
    return [{ nombre: 'asc' as const }];
  }

  protected formatRolResponse(rol: any) {
    if (!rol) return null;

    return {
      id_rol: rol.id_rol,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      rol_padre_id: rol.rol_padre_id,
      rol_padre: rol.rol
        ? {
            id_rol: rol.rol.id_rol,
            nombre: rol.rol.nombre,
          }
        : null,
      usuarios:
        rol.usuario?.map((usuario: any) => ({
          id_usuario: usuario.id_usuario,
          nombre: usuario.nombre,
          email: usuario.email,
        })) || [],
      permisos:
        rol.permisoRol?.map((pr: any) => ({
          id_permiso: pr.permiso.id_permiso,
          nombre: pr.permiso.nombre,
          descripcion: pr.permiso.descripcion,
        })) || [],
      roles_hijos:
        rol.other_Rol?.map((hijo: any) => ({
          id_rol: hijo.id_rol,
          nombre: hijo.nombre,
          descripcion: hijo.descripcion,
        })) || [],
      estadisticas: {
        total_usuarios: rol.usuario?.length || 0,
        total_permisos: rol.permisoRol?.length || 0,
        total_roles_hijos: rol.other_Rol?.length || 0,
        es_rol_padre: (rol.other_Rol?.length || 0) > 0,
        tiene_rol_padre: rol.rol_padre_id !== null,
      },
    };
  }

  // Métodos de búsqueda específicos
  async findRolById(id: number) {
    await this.validationService.validateRolExists(id);

    const rol = await this.prisma.rol.findUnique({
      where: { id_rol: id },
      include: this.getDefaultIncludes(),
    });

    return this.formatRolResponse(rol);
  }

  async findRolesByParent(parentId: number | null) {
    const roles = await this.prisma.rol.findMany({
      where: { rol_padre_id: parentId },
      include: this.getDefaultIncludes(),
      orderBy: this.getDefaultOrderBy(),
    });

    return roles.map((rol) => this.formatRolResponse(rol));
  }

  async findRolesWithUsers() {
    const roles = await this.prisma.rol.findMany({
      where: {
        usuario: {
          some: {},
        },
      },
      include: this.getDefaultIncludes(),
      orderBy: this.getDefaultOrderBy(),
    });

    return roles.map((rol) => this.formatRolResponse(rol));
  }

  async findRolesWithoutUsers() {
    const roles = await this.prisma.rol.findMany({
      where: {
        usuario: {
          none: {},
        },
      },
      include: this.getDefaultIncludes(),
      orderBy: this.getDefaultOrderBy(),
    });

    return roles.map((rol) => this.formatRolResponse(rol));
  }

  // Métodos de jerarquía
  async getRoleHierarchy(rootRolId?: number) {
    const whereClause = rootRolId
      ? { id_rol: rootRolId }
      : { rol_padre_id: null };

    const buildHierarchy = async (rolId: number): Promise<any> => {
      const rol = await this.prisma.rol.findUnique({
        where: { id_rol: rolId },
        include: {
          other_Rol: true,
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              email: true,
            },
          },
          permisoRol: {
            include: {
              permiso: {
                select: {
                  id_permiso: true,
                  nombre: true,
                },
              },
            },
          },
        },
      });

      if (!rol) return null;

      const children = await Promise.all(
        rol.other_Rol.map((child) => buildHierarchy(child.id_rol)),
      );

      return {
        ...this.formatRolResponse(rol),
        children: children.filter((child) => child !== null),
      };
    };

    if (rootRolId) {
      return buildHierarchy(rootRolId);
    } else {
      const rootRoles = await this.prisma.rol.findMany({
        where: { rol_padre_id: null },
        select: { id_rol: true },
      });

      const hierarchies = await Promise.all(
        rootRoles.map((root) => buildHierarchy(root.id_rol)),
      );

      return hierarchies.filter((hierarchy) => hierarchy !== null);
    }
  }
}
