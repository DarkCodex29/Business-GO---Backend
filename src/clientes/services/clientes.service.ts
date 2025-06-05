import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from '../dto/create-cliente.dto';
import { UpdateClientDto } from '../dto/update-cliente.dto';
import { BaseClienteService, IClienteQuery } from './base-cliente.service';
import { ClienteValidationService } from './cliente-validation.service';

@Injectable()
export class ClientesService extends BaseClienteService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly clienteValidationService: ClienteValidationService,
  ) {
    super(prisma, clienteValidationService);
  }

  async getClientes(empresaId: number, query?: Partial<IClienteQuery>) {
    const clienteQuery: IClienteQuery = {
      empresaId,
      ...query,
    };
    return this.findClientesByEmpresa(clienteQuery);
  }

  async getCliente(empresaId: number, clienteId: number) {
    return this.findClienteByEmpresa(empresaId, clienteId);
  }

  async createCliente(empresaId: number, createClienteDto: CreateClientDto) {
    try {
      const {
        nombre,
        email,
        telefono,
        tipo_cliente,
        preferencias,
        limite_credito,
        dias_credito,
        id_usuario,
      } = createClienteDto;

      // Validaciones usando el servicio especializado
      this.clienteValidationService.validateEmail(email);
      this.clienteValidationService.validateTelefono(telefono);
      this.clienteValidationService.validateTipoCliente(tipo_cliente);
      this.clienteValidationService.validateLimiteCredito(limite_credito);
      this.clienteValidationService.validateDiasCredito(dias_credito);
      this.clienteValidationService.validatePreferencias(preferencias);

      // Validar email único en la empresa
      await this.clienteValidationService.validateUniqueEmail(email, empresaId);

      // Validar usuario si se proporciona
      if (id_usuario) {
        await this.clienteValidationService.validateUsuarioExists(id_usuario);
      }

      // Preparar datos del cliente
      const clienteData: any = {
        nombre,
        email,
        telefono,
        tipo_cliente: tipo_cliente.toUpperCase(),
        preferencias,
        limite_credito,
        dias_credito,
      };

      // Conectar usuario si se proporciona
      if (id_usuario) {
        clienteData.usuario = {
          connect: { id_usuario },
        };
      }

      return this.createClienteTransaction(empresaId, clienteData);
    } catch (error) {
      this.logger.error(`Error al crear cliente: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un cliente con este email en la empresa',
        );
      }

      throw error;
    }
  }

  async updateCliente(
    empresaId: number,
    clienteId: number,
    updateClienteDto: UpdateClientDto,
  ) {
    try {
      // Verificar que el cliente existe para la empresa
      await this.clienteValidationService.validateClienteEmpresaExists(
        empresaId,
        clienteId,
      );

      const {
        email,
        telefono,
        tipo_cliente,
        preferencias,
        limite_credito,
        dias_credito,
        id_usuario,
        ...restData
      } = updateClienteDto;

      // Validaciones si se proporcionan los campos
      if (email) {
        this.clienteValidationService.validateEmail(email);
        await this.clienteValidationService.validateUniqueEmail(
          email,
          empresaId,
          clienteId,
        );
      }

      if (telefono) {
        this.clienteValidationService.validateTelefono(telefono);
      }

      if (tipo_cliente) {
        this.clienteValidationService.validateTipoCliente(tipo_cliente);
      }

      if (limite_credito !== undefined) {
        this.clienteValidationService.validateLimiteCredito(limite_credito);
      }

      if (dias_credito !== undefined) {
        this.clienteValidationService.validateDiasCredito(dias_credito);
      }

      if (preferencias) {
        this.clienteValidationService.validatePreferencias(preferencias);
      }

      if (id_usuario) {
        await this.clienteValidationService.validateUsuarioExists(id_usuario);
      }

      // Preparar datos para actualizar
      const updateData: any = {
        ...restData,
        email,
        telefono,
        tipo_cliente: tipo_cliente?.toUpperCase(),
        preferencias,
        limite_credito,
        dias_credito,
      };

      // Conectar usuario si se proporciona
      if (id_usuario) {
        updateData.usuario = {
          connect: { id_usuario },
        };
      }

      // Limpiar campos undefined
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      return this.updateClienteTransaction(clienteId, updateData);
    } catch (error) {
      this.logger.error(
        `Error al actualizar cliente ${clienteId}: ${error.message}`,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un cliente con este email en la empresa',
        );
      }

      throw error;
    }
  }

  async deleteCliente(empresaId: number, clienteId: number) {
    return this.deleteClienteFromEmpresa(empresaId, clienteId);
  }

  async getClienteStats(empresaId: number) {
    return this.getClienteStats(empresaId);
  }
}
