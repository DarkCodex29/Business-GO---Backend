import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRolDto } from '../dto/create-rol.dto';
import { UpdateRolDto } from '../dto/update-rol.dto';
import { AsignarPermisosDto } from '../dto/asignar-permisos.dto';
import { BaseRolesService } from './base-roles.service';
import { RolesValidationService } from './roles-validation.service';
import { RolesCalculationService } from './roles-calculation.service';
import {
  RolMetrics,
  RolUsageStats,
  PermissionDistribution,
} from '../types/roles.types';

@Injectable()
export class RolesService extends BaseRolesService {
  protected readonly logger = new Logger(RolesService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly validationService: RolesValidationService,
    private readonly calculationService: RolesCalculationService,
  ) {
    super(prisma, validationService);
  }

  // Métodos principales usando Template Method Pattern
  async create(createRolDto: CreateRolDto) {
    return this.createRolTemplate(createRolDto);
  }

  async findAll(filters?: any) {
    return this.findRolesTemplate(filters);
  }

  async findOne(id: number) {
    return this.findRolById(id);
  }

  async update(id: number, updateRolDto: UpdateRolDto) {
    return this.updateRolTemplate(id, updateRolDto);
  }

  async remove(id: number) {
    return this.deleteRolTemplate(id);
  }

  // Gestión de permisos
  async asignarPermisos(id: number, asignarPermisosDto: AsignarPermisosDto) {
    this.logger.log(`Asignando permisos al rol ID: ${id}`);

    // Validaciones
    await this.validationService.validateRolExists(id);
    this.validationService.validateAsignarPermisosData(asignarPermisosDto);
    await this.validationService.validatePermisosExist(
      asignarPermisosDto.permisoIds,
    );

    // Eliminar permisos existentes
    await this.prisma.permisoRol.deleteMany({
      where: { rol_id: id },
    });

    // Crear nuevas relaciones
    const permisosCreados = await Promise.all(
      asignarPermisosDto.permisoIds.map((permisoId) =>
        this.prisma.permisoRol.create({
          data: {
            rol_id: id,
            permiso_id: permisoId,
          },
        }),
      ),
    );

    this.logger.log(
      `Asignados ${permisosCreados.length} permisos al rol ID: ${id}`,
    );

    // Retornar rol actualizado
    return this.findRolById(id);
  }

  async removerPermiso(rolId: number, permisoId: number) {
    this.logger.log(`Removiendo permiso ${permisoId} del rol ${rolId}`);

    // Validaciones
    await this.validationService.validateRolExists(rolId);
    await this.validationService.validatePermisoRolExists(rolId, permisoId);

    // Eliminar relación
    await this.prisma.permisoRol.deleteMany({
      where: {
        rol_id: rolId,
        permiso_id: permisoId,
      },
    });

    this.logger.log(`Permiso ${permisoId} removido del rol ${rolId}`);
    return { message: 'Permiso removido exitosamente' };
  }

  // Métodos de búsqueda específicos
  async findRolesByParent(parentId: number | null) {
    return super.findRolesByParent(parentId);
  }

  async findRolesWithUsers() {
    return super.findRolesWithUsers();
  }

  async findRolesWithoutUsers() {
    return super.findRolesWithoutUsers();
  }

  async getRoleHierarchy(rootRolId?: number) {
    return super.getRoleHierarchy(rootRolId);
  }

  // Métodos de métricas y análisis
  async getMetrics(): Promise<RolMetrics> {
    return this.calculationService.calculateRolMetrics();
  }

  async getUsageStats(): Promise<RolUsageStats[]> {
    return this.calculationService.calculateRolUsageStats();
  }

  async getPermissionDistribution(): Promise<PermissionDistribution[]> {
    return this.calculationService.calculatePermissionDistribution();
  }

  async analyzeHierarchy() {
    return this.calculationService.analyzeRoleHierarchy();
  }

  async getActivityMetrics(fechaInicio: Date, fechaFin: Date) {
    return this.calculationService.calculateRoleActivityMetrics(
      fechaInicio,
      fechaFin,
    );
  }

  async analyzeEfficiency() {
    return this.calculationService.analyzeRoleEfficiency();
  }

  async findProblematicRoles() {
    return this.calculationService.findProblematicRoles();
  }
}
