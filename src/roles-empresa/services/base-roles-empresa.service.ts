import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesEmpresaValidationService } from './roles-empresa-validation.service';
import { CreateEmpresaRolDto } from '../dto/create-rol-empresa.dto';
import { UpdateEmpresaRolDto } from '../dto/update-rol-empresa.dto';

@Injectable()
export class BaseRolesEmpresaService {
  protected readonly logger = new Logger(BaseRolesEmpresaService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: RolesEmpresaValidationService,
  ) {}

  // Template Method para crear rol de empresa
  async createRolEmpresaTemplate(createRolDto: CreateEmpresaRolDto) {
    this.logger.log(
      `Iniciando creación de rol empresa: ${createRolDto.nombre}`,
    );

    // 1. Validaciones previas
    await this.preCreateValidations(createRolDto);

    // 2. Preparar datos
    const rolData = await this.prepareCreateData(createRolDto);

    // 3. Crear rol
    const rol = await this.executeCreate(rolData);

    // 4. Post-procesamiento
    const processedRol = await this.postCreateProcessing(rol);

    this.logger.log(
      `Rol empresa creado exitosamente: ${rol.nombre} (ID: ${rol.id_rol})`,
    );
    return processedRol;
  }

  // Template Method para actualizar rol de empresa
  async updateRolEmpresaTemplate(
    id: number,
    updateRolDto: UpdateEmpresaRolDto,
  ) {
    this.logger.log(`Iniciando actualización de rol empresa ID: ${id}`);

    // 1. Validaciones previas
    await this.preUpdateValidations(id, updateRolDto);

    // 2. Preparar datos
    const rolData = await this.prepareUpdateData(id, updateRolDto);

    // 3. Actualizar rol
    const rol = await this.executeUpdate(id, rolData);

    // 4. Post-procesamiento
    const processedRol = await this.postUpdateProcessing(rol);

    this.logger.log(
      `Rol empresa actualizado exitosamente: ${rol.nombre} (ID: ${rol.id_rol})`,
    );
    return processedRol;
  }

  // Template Method para eliminar rol de empresa
  async deleteRolEmpresaTemplate(id: number) {
    this.logger.log(`Iniciando eliminación de rol empresa ID: ${id}`);

    // 1. Validaciones previas
    await this.preDeleteValidations(id);

    // 2. Obtener datos antes de eliminar
    const rolData = await this.getBeforeDelete(id);

    // 3. Eliminar rol
    await this.executeDelete(id);

    // 4. Post-procesamiento
    await this.postDeleteProcessing(rolData);

    this.logger.log(`Rol empresa eliminado exitosamente: ID ${id}`);
    return { message: 'Rol de empresa eliminado exitosamente' };
  }

  // Template Method para buscar roles de empresa
  async findRolesEmpresaTemplate(filters?: any) {
    this.logger.log('Iniciando búsqueda de roles de empresa');

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
    createRolDto: CreateEmpresaRolDto,
  ): Promise<void> {
    // Validaciones básicas
    this.validationService.validateCreateRolEmpresaData(createRolDto);
    this.validationService.validateRolEmpresaContextoPeruano(
      createRolDto.nombre,
    );

    // Validaciones de base de datos
    await this.validationService.validateEmpresaExists(createRolDto.id_empresa);
    await this.validationService.validateUniqueNombreRolEnEmpresa(
      createRolDto.nombre,
      createRolDto.id_empresa,
    );
    await this.validationService.validateEmpresaRoleLimits(
      createRolDto.id_empresa,
    );

    // Validaciones de horarios laborales peruanos
    if (createRolDto.horario_inicio && createRolDto.horario_fin) {
      this.validationService.validateHorarioLaboralPeruano(
        createRolDto.horario_inicio,
        createRolDto.horario_fin,
      );
    }
  }

  protected async preUpdateValidations(
    id: number,
    updateRolDto: UpdateEmpresaRolDto,
  ): Promise<void> {
    // Validar que el rol existe
    await this.validationService.validateRolEmpresaExists(id);

    // Validaciones de datos
    this.validationService.validateUpdateRolEmpresaData(updateRolDto);

    if (updateRolDto.nombre) {
      this.validationService.validateRolEmpresaContextoPeruano(
        updateRolDto.nombre,
      );

      // Obtener empresa del rol para validar unicidad
      const rolActual = await this.prisma.rolEmpresa.findUnique({
        where: { id_rol: id },
        select: { id_empresa: true },
      });

      if (rolActual) {
        await this.validationService.validateUniqueNombreRolEnEmpresa(
          updateRolDto.nombre,
          rolActual.id_empresa,
          id,
        );
      }
    }

    // Validaciones de horarios laborales peruanos
    if (updateRolDto.horario_inicio && updateRolDto.horario_fin) {
      this.validationService.validateHorarioLaboralPeruano(
        updateRolDto.horario_inicio,
        updateRolDto.horario_fin,
      );
    }
  }

  protected async preDeleteValidations(id: number): Promise<void> {
    await this.validationService.validateRolEmpresaExists(id);
    await this.validationService.validateRolEmpresaCanBeDeleted(id);
  }

  // Métodos de preparación de datos (pueden ser sobrescritos)
  protected async prepareCreateData(
    createRolDto: CreateEmpresaRolDto,
  ): Promise<any> {
    return {
      nombre: createRolDto.nombre.trim(),
      descripcion: createRolDto.descripcion?.trim() || null,
      id_empresa: createRolDto.id_empresa,
      horario_inicio: createRolDto.horario_inicio || null,
      horario_fin: createRolDto.horario_fin || null,
      fecha_inicio: createRolDto.fecha_inicio || null,
      fecha_fin: createRolDto.fecha_fin || null,
    };
  }

  protected async prepareUpdateData(
    id: number,
    updateRolDto: UpdateEmpresaRolDto,
  ): Promise<any> {
    const updateData: any = {};

    if (updateRolDto.nombre !== undefined) {
      updateData.nombre = updateRolDto.nombre.trim();
    }

    if (updateRolDto.descripcion !== undefined) {
      updateData.descripcion = updateRolDto.descripcion?.trim() || null;
    }

    if (updateRolDto.horario_inicio !== undefined) {
      updateData.horario_inicio = updateRolDto.horario_inicio;
    }

    if (updateRolDto.horario_fin !== undefined) {
      updateData.horario_fin = updateRolDto.horario_fin;
    }

    if (updateRolDto.fecha_inicio !== undefined) {
      updateData.fecha_inicio = updateRolDto.fecha_inicio;
    }

    if (updateRolDto.fecha_fin !== undefined) {
      updateData.fecha_fin = updateRolDto.fecha_fin;
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

    if (filters?.id_empresa !== undefined) {
      whereClause.id_empresa = filters.id_empresa;
    }

    if (filters?.conUsuarios === true) {
      whereClause.usuarios = {
        some: {
          OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
        },
      };
    }

    if (filters?.sinUsuarios === true) {
      whereClause.usuarios = {
        none: {},
      };
    }

    if (filters?.activos === true) {
      whereClause.OR = [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }];
    }

    if (filters?.horarioDefinido === true) {
      whereClause.AND = [
        { horario_inicio: { not: null } },
        { horario_fin: { not: null } },
      ];
    }

    return {
      where: whereClause,
      include: this.getDefaultIncludes(),
      orderBy: this.getDefaultOrderBy(),
    };
  }

  // Métodos de ejecución (pueden ser sobrescritos)
  protected async executeCreate(rolData: any) {
    return this.prisma.rolEmpresa.create({
      data: rolData,
      include: this.getDefaultIncludes(),
    });
  }

  protected async executeUpdate(id: number, rolData: any) {
    return this.prisma.rolEmpresa.update({
      where: { id_rol: id },
      data: rolData,
      include: this.getDefaultIncludes(),
    });
  }

  protected async executeDelete(id: number) {
    // Primero eliminar permisos asociados
    await this.prisma.permisoRolEmpresa.deleteMany({
      where: { id_rol: id },
    });

    // Luego eliminar asignaciones de usuarios (marcar como finalizadas)
    await this.prisma.usuarioRolEmpresa.updateMany({
      where: {
        id_rol: id,
        fecha_fin: null,
      },
      data: {
        fecha_fin: new Date(),
      },
    });

    // Finalmente eliminar el rol
    return this.prisma.rolEmpresa.delete({
      where: { id_rol: id },
    });
  }

  protected async executeSearch(searchParams: any) {
    return this.prisma.rolEmpresa.findMany(searchParams);
  }

  protected async getBeforeDelete(id: number) {
    return this.prisma.rolEmpresa.findUnique({
      where: { id_rol: id },
      include: {
        empresa: true,
        usuarios: {
          where: {
            OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
          },
        },
        permisos: true,
      },
    });
  }

  // Métodos de post-procesamiento (pueden ser sobrescritos)
  protected async postCreateProcessing(rol: any) {
    return this.formatRolEmpresaResponse(rol);
  }

  protected async postUpdateProcessing(rol: any) {
    return this.formatRolEmpresaResponse(rol);
  }

  protected async postDeleteProcessing(rolData: any): Promise<void> {
    // Log de auditoría
    this.logger.log(
      `Rol empresa eliminado: ${rolData?.nombre} de empresa ${rolData?.empresa?.nombre} tenía ${rolData?.usuarios?.length || 0} usuarios activos`,
    );
  }

  protected async postSearchProcessing(roles: any[]) {
    return roles.map((rol) => this.formatRolEmpresaResponse(rol));
  }

  // Métodos de utilidad (pueden ser sobrescritos)
  protected getDefaultIncludes() {
    return {
      empresa: {
        select: {
          id_empresa: true,
          nombre: true,
          ruc: true,
        },
      },
      usuarios: {
        where: {
          OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              email: true,
            },
          },
        },
      },
      permisos: {
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
    };
  }

  protected getDefaultOrderBy() {
    return [
      { empresa: { nombre: 'asc' as const } },
      { nombre: 'asc' as const },
    ];
  }

  protected formatRolEmpresaResponse(rol: any) {
    if (!rol) return null;

    // Calcular horas de trabajo si están definidas
    let horasTrabajo: number | null = null;
    if (rol.horario_inicio && rol.horario_fin) {
      const [horaInicio] = rol.horario_inicio.split(':').map(Number);
      const [horaFin] = rol.horario_fin.split(':').map(Number);
      let horas = horaFin - horaInicio;
      if (horas < 0) horas += 24;
      horasTrabajo = horas;
    }

    return {
      id_rol: rol.id_rol,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      empresa: rol.empresa
        ? {
            id_empresa: rol.empresa.id_empresa,
            nombre: rol.empresa.nombre,
            ruc: rol.empresa.ruc,
          }
        : null,
      horarios: {
        horario_inicio: rol.horario_inicio,
        horario_fin: rol.horario_fin,
        horas_trabajo: horasTrabajo,
        cumple_ley_laboral_peruana: horasTrabajo ? horasTrabajo <= 8 : null,
      },
      fechas: {
        fecha_inicio: rol.fecha_inicio,
        fecha_fin: rol.fecha_fin,
        fecha_creacion: rol.fecha_creacion,
        fecha_actualizacion: rol.fecha_actualizacion,
        activo: !rol.fecha_fin || rol.fecha_fin > new Date(),
      },
      usuarios_activos:
        rol.usuarios?.map((ur: any) => ({
          id_usuario: ur.id_usuario,
          nombre: ur.usuario?.nombre,
          email: ur.usuario?.email,
          fecha_inicio: ur.fecha_inicio,
          fecha_fin: ur.fecha_fin,
        })) || [],
      permisos:
        rol.permisos?.map((pr: any) => ({
          id_permiso: pr.permiso?.id_permiso,
          nombre: pr.permiso?.nombre,
          descripcion: pr.permiso?.descripcion,
          recurso: pr.recurso,
          accion: pr.accion,
        })) || [],
      estadisticas: {
        total_usuarios_activos: rol.usuarios?.length || 0,
        total_permisos: rol.permisos?.length || 0,
        tiene_horario_definido: !!(rol.horario_inicio && rol.horario_fin),
        cumple_normativa_peruana: this.validatePeruvianCompliance(rol),
      },
    };
  }

  // Validación de cumplimiento normativo peruano
  private validatePeruvianCompliance(rol: any): {
    cumple_horario: boolean;
    observaciones: string[];
  } {
    const observaciones: string[] = [];
    let cumpleHorario = true;

    // Validar horario laboral peruano (máximo 8 horas)
    if (rol.horario_inicio && rol.horario_fin) {
      const [horaInicio] = rol.horario_inicio.split(':').map(Number);
      const [horaFin] = rol.horario_fin.split(':').map(Number);
      let horasTrabajo = horaFin - horaInicio;
      if (horasTrabajo < 0) horasTrabajo += 24;

      if (horasTrabajo > 8) {
        cumpleHorario = false;
        observaciones.push(
          `Horario excede las 8 horas diarias permitidas por ley peruana (${horasTrabajo} horas)`,
        );
      }
    } else {
      observaciones.push(
        'Horario no definido - recomendable para cumplimiento laboral',
      );
    }

    return {
      cumple_horario: cumpleHorario,
      observaciones,
    };
  }

  // Métodos de búsqueda específicos
  async findRolEmpresaById(id: number) {
    await this.validationService.validateRolEmpresaExists(id);

    const rol = await this.prisma.rolEmpresa.findUnique({
      where: { id_rol: id },
      include: this.getDefaultIncludes(),
    });

    return this.formatRolEmpresaResponse(rol);
  }

  async findRolesByEmpresa(empresaId: number) {
    await this.validationService.validateEmpresaExists(empresaId);

    const roles = await this.prisma.rolEmpresa.findMany({
      where: { id_empresa: empresaId },
      include: this.getDefaultIncludes(),
      orderBy: this.getDefaultOrderBy(),
    });

    return roles.map((rol) => this.formatRolEmpresaResponse(rol));
  }

  async findRolesWithActiveUsers() {
    const roles = await this.prisma.rolEmpresa.findMany({
      where: {
        usuarios: {
          some: {
            OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
          },
        },
      },
      include: this.getDefaultIncludes(),
      orderBy: this.getDefaultOrderBy(),
    });

    return roles.map((rol) => this.formatRolEmpresaResponse(rol));
  }

  async findRolesWithoutUsers() {
    const roles = await this.prisma.rolEmpresa.findMany({
      where: {
        usuarios: {
          none: {},
        },
      },
      include: this.getDefaultIncludes(),
      orderBy: this.getDefaultOrderBy(),
    });

    return roles.map((rol) => this.formatRolEmpresaResponse(rol));
  }
}
