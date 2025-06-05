import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmpresaRolDto } from '../dto/create-rol-empresa.dto';
import { UpdateEmpresaRolDto } from '../dto/update-rol-empresa.dto';
import { AsignarRolDto } from '../dto/asignar-rol.dto';

@Injectable()
export class RolesEmpresaValidationService {
  constructor(private readonly prisma: PrismaService) {}

  // Validaciones para creación de roles de empresa
  validateCreateRolEmpresaData(createRolDto: CreateEmpresaRolDto): void {
    this.validateNombreRol(createRolDto.nombre);
    this.validateDescripcionRol(createRolDto.descripcion);
    this.validateEmpresaId(createRolDto.id_empresa);

    if (createRolDto.horario_inicio && createRolDto.horario_fin) {
      this.validateHorarios(
        createRolDto.horario_inicio,
        createRolDto.horario_fin,
      );
    }

    if (createRolDto.fecha_inicio && createRolDto.fecha_fin) {
      this.validateFechas(createRolDto.fecha_inicio, createRolDto.fecha_fin);
    }
  }

  // Validaciones para actualización de roles de empresa
  validateUpdateRolEmpresaData(updateRolDto: UpdateEmpresaRolDto): void {
    if (updateRolDto.nombre) {
      this.validateNombreRol(updateRolDto.nombre);
    }

    if (updateRolDto.descripcion) {
      this.validateDescripcionRol(updateRolDto.descripcion);
    }

    if (updateRolDto.horario_inicio && updateRolDto.horario_fin) {
      this.validateHorarios(
        updateRolDto.horario_inicio,
        updateRolDto.horario_fin,
      );
    }

    if (updateRolDto.fecha_inicio && updateRolDto.fecha_fin) {
      this.validateFechas(updateRolDto.fecha_inicio, updateRolDto.fecha_fin);
    }
  }

  // Validaciones para asignación de roles
  validateAsignarRolData(asignarRolDto: AsignarRolDto): void {
    this.validateUsuarioId(asignarRolDto.id_usuario);
    this.validateRolEmpresaId(asignarRolDto.id_rol);
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

    if (nombre.length > 100) {
      throw new BadRequestException(
        'El nombre del rol no puede exceder 100 caracteres',
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

      if (descripcion.length > 1000) {
        throw new BadRequestException(
          'La descripción no puede exceder 1000 caracteres',
        );
      }
    }
  }

  private validateEmpresaId(empresaId: number): void {
    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      throw new BadRequestException(
        'El ID de la empresa debe ser un número entero positivo',
      );
    }
  }

  private validateUsuarioId(usuarioId: number): void {
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException(
        'El ID del usuario debe ser un número entero positivo',
      );
    }
  }

  private validateRolEmpresaId(rolId: number): void {
    if (!Number.isInteger(rolId) || rolId <= 0) {
      throw new BadRequestException(
        'El ID del rol debe ser un número entero positivo',
      );
    }
  }

  private validateHorarios(horarioInicio: string, horarioFin: string): void {
    // Validar formato de horario (HH:MM)
    const horarioRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!horarioRegex.test(horarioInicio)) {
      throw new BadRequestException(
        'El horario de inicio debe tener formato HH:MM (24 horas)',
      );
    }

    if (!horarioRegex.test(horarioFin)) {
      throw new BadRequestException(
        'El horario de fin debe tener formato HH:MM (24 horas)',
      );
    }

    // Validar que el horario de inicio sea menor que el de fin
    const [horaInicio, minutoInicio] = horarioInicio.split(':').map(Number);
    const [horaFin, minutoFin] = horarioFin.split(':').map(Number);

    const minutosInicio = horaInicio * 60 + minutoInicio;
    const minutosFin = horaFin * 60 + minutoFin;

    if (minutosInicio >= minutosFin) {
      throw new BadRequestException(
        'El horario de inicio debe ser menor que el horario de fin',
      );
    }

    // Validar horarios de trabajo típicos en Perú (6:00 AM - 11:00 PM)
    if (minutosInicio < 360 || minutosFin > 1380) {
      // 6:00 AM = 360 min, 11:00 PM = 1380 min
      throw new BadRequestException(
        'Los horarios deben estar dentro del rango laboral típico (06:00 - 23:00)',
      );
    }
  }

  private validateFechas(fechaInicio: Date, fechaFin: Date): void {
    const ahora = new Date();

    // Validar que las fechas sean válidas
    if (!(fechaInicio instanceof Date) || isNaN(fechaInicio.getTime())) {
      throw new BadRequestException('La fecha de inicio no es válida');
    }

    if (!(fechaFin instanceof Date) || isNaN(fechaFin.getTime())) {
      throw new BadRequestException('La fecha de fin no es válida');
    }

    // Validar que la fecha de inicio sea menor que la de fin
    if (fechaInicio >= fechaFin) {
      throw new BadRequestException(
        'La fecha de inicio debe ser menor que la fecha de fin',
      );
    }

    // Validar que la fecha de fin no sea en el pasado
    if (fechaFin < ahora) {
      throw new BadRequestException(
        'La fecha de fin no puede ser en el pasado',
      );
    }

    // Validar que el período no sea excesivamente largo (máximo 5 años)
    const cincoAños = 5 * 365 * 24 * 60 * 60 * 1000; // 5 años en milisegundos
    if (fechaFin.getTime() - fechaInicio.getTime() > cincoAños) {
      throw new BadRequestException(
        'El período del rol no puede exceder 5 años',
      );
    }
  }

  // Validaciones de existencia en base de datos
  async validateEmpresaExists(empresaId: number): Promise<void> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id_empresa: empresaId },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${empresaId} no encontrada`);
    }
  }

  async validateUsuarioExists(usuarioId: number): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado`);
    }
  }

  async validateRolEmpresaExists(rolId: number): Promise<void> {
    const rol = await this.prisma.rolEmpresa.findUnique({
      where: { id_rol: rolId },
    });

    if (!rol) {
      throw new NotFoundException(
        `Rol de empresa con ID ${rolId} no encontrado`,
      );
    }
  }

  async validateUniqueNombreRolEnEmpresa(
    nombre: string,
    empresaId: number,
    excludeId?: number,
  ): Promise<void> {
    const whereClause: any = {
      nombre: nombre.trim(),
      id_empresa: empresaId,
    };

    if (excludeId) {
      whereClause.id_rol = { not: excludeId };
    }

    const rolExistente = await this.prisma.rolEmpresa.findFirst({
      where: whereClause,
    });

    if (rolExistente) {
      throw new ConflictException(
        `Ya existe un rol con el nombre "${nombre}" en esta empresa`,
      );
    }
  }

  async validatePermisosEmpresaExist(permisoIds: number[]): Promise<void> {
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

  async validateRolEmpresaCanBeDeleted(rolId: number): Promise<void> {
    // Verificar que el rol no tenga usuarios asignados actualmente
    const usuariosConRol = await this.prisma.usuarioRolEmpresa.count({
      where: {
        id_rol: rolId,
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
    });

    if (usuariosConRol > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rol porque tiene ${usuariosConRol} usuario(s) asignado(s) actualmente`,
      );
    }
  }

  async validateUsuarioEmpresaRelation(
    usuarioId: number,
    empresaId: number,
  ): Promise<void> {
    const usuarioEmpresa = await this.prisma.usuarioEmpresa.findFirst({
      where: {
        usuario_id: usuarioId,
        empresa_id: empresaId,
      },
    });

    if (!usuarioEmpresa) {
      throw new BadRequestException(
        `El usuario ${usuarioId} no pertenece a la empresa ${empresaId}`,
      );
    }
  }

  async validateUsuarioNoTieneRolActivo(
    usuarioId: number,
    rolId: number,
  ): Promise<void> {
    const rolActivo = await this.prisma.usuarioRolEmpresa.findFirst({
      where: {
        id_usuario: usuarioId,
        id_rol: rolId,
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: new Date() } }],
      },
    });

    if (rolActivo) {
      throw new ConflictException(
        `El usuario ya tiene este rol asignado activamente`,
      );
    }
  }

  // Validaciones específicas para contexto peruano
  validateRolEmpresaContextoPeruano(nombre: string): void {
    // Lista de roles típicos en empresas peruanas
    const rolesComunes = [
      'GERENTE_GENERAL',
      'GERENTE_VENTAS',
      'GERENTE_OPERACIONES',
      'SUPERVISOR',
      'VENDEDOR',
      'CAJERO',
      'ALMACENERO',
      'CONTADOR',
      'ASISTENTE_ADMINISTRATIVO',
      'RECEPCIONISTA',
    ];

    // Validar nombres apropiados para contexto empresarial peruano
    const nombresInapropiados = ['ADMIN', 'ROOT', 'SUDO', 'SYSTEM'];

    if (nombresInapropiados.includes(nombre.toUpperCase())) {
      throw new BadRequestException(
        `El nombre "${nombre}" no es apropiado para roles empresariales`,
      );
    }

    // Sugerir nombres comunes si el nombre no es estándar
    const nombreUpper = nombre.toUpperCase();
    const esNombreComun = rolesComunes.some(
      (rol) => nombreUpper.includes(rol) || rol.includes(nombreUpper),
    );

    if (!esNombreComun && nombre.length < 10) {
      // Solo es una advertencia, no bloquea la creación
      console.warn(
        `Nombre de rol "${nombre}" no es estándar. Considere usar: ${rolesComunes.slice(0, 5).join(', ')}`,
      );
    }
  }

  // Validaciones de límites por empresa
  async validateEmpresaRoleLimits(empresaId: number): Promise<void> {
    const totalRoles = await this.prisma.rolEmpresa.count({
      where: { id_empresa: empresaId },
    });

    const MAX_ROLES_POR_EMPRESA = 50; // Límite máximo de roles por empresa

    if (totalRoles >= MAX_ROLES_POR_EMPRESA) {
      throw new BadRequestException(
        `Se ha alcanzado el límite máximo de ${MAX_ROLES_POR_EMPRESA} roles para esta empresa`,
      );
    }
  }

  // Validaciones de horarios laborales peruanos
  validateHorarioLaboralPeruano(
    horarioInicio: string,
    horarioFin: string,
  ): void {
    const [horaInicio] = horarioInicio.split(':').map(Number);
    const [horaFin] = horarioFin.split(':').map(Number);

    // Horarios típicos en Perú
    const HORA_INICIO_TIPICA = 8; // 8:00 AM
    const HORA_FIN_TIPICA = 18; // 6:00 PM
    const MAX_HORAS_DIARIAS = 8; // Máximo 8 horas según ley laboral peruana

    // Calcular horas de trabajo
    let horasTrabajo = horaFin - horaInicio;
    if (horasTrabajo < 0) {
      horasTrabajo += 24; // Para horarios nocturnos
    }

    // Validar límite de horas diarias
    if (horasTrabajo > MAX_HORAS_DIARIAS) {
      throw new BadRequestException(
        `El horario no puede exceder ${MAX_HORAS_DIARIAS} horas diarias según la legislación laboral peruana`,
      );
    }

    // Advertir sobre horarios atípicos
    if (horaInicio < 6 || horaInicio > 10) {
      console.warn(
        `Horario de inicio ${horarioInicio} es atípico para empresas peruanas`,
      );
    }

    if (horaFin < 16 || horaFin > 22) {
      console.warn(
        `Horario de fin ${horarioFin} es atípico para empresas peruanas`,
      );
    }
  }
}
