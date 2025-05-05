import { Test, TestingModule } from '@nestjs/testing';
import { CotizacionesService } from './cotizaciones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoCotizacion } from '../dto/create-cotizacion.dto';

describe('CotizacionesService', () => {
  let service: CotizacionesService;

  // Mock para el servicio de Prisma
  const mockPrismaService = {
    cotizacion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    itemCotizacion: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    productoServicio: {
      findUnique: jest.fn(),
    },
    clienteEmpresa: {
      findFirst: jest.fn(),
    },
    cliente: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CotizacionesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CotizacionesService>(CotizacionesService);

    // Limpiar los mocks después de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of cotizaciones with pagination', async () => {
      // Datos mock
      const empresaId = 1;
      const page = 1;
      const limit = 10;
      const mockCotizaciones = [
        { id_cotizacion: 1, cliente: { nombre: 'Cliente 1' }, total: 100 },
        { id_cotizacion: 2, cliente: { nombre: 'Cliente 2' }, total: 200 },
      ];
      const mockCount = 2;

      // Configurar los mocks
      mockPrismaService.cotizacion.findMany.mockResolvedValue(mockCotizaciones);
      mockPrismaService.cotizacion.count.mockResolvedValue(mockCount);

      // Ejecutar el método
      const result = await service.findAll(empresaId);

      // Verificar
      expect(mockPrismaService.cotizacion.findMany).toHaveBeenCalledWith({
        where: { id_empresa: empresaId },
        include: { cliente: true },
        skip: 0,
        take: limit,
      });
      expect(mockPrismaService.cotizacion.count).toHaveBeenCalledWith({
        where: { id_empresa: empresaId },
      });
      expect(result).toEqual({
        data: mockCotizaciones,
        meta: {
          total: mockCount,
          page,
          limit,
          totalPages: Math.ceil(mockCount / limit),
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a cotización when it exists', async () => {
      // Datos mock
      const empresaId = 1;
      const cotizacionId = 1;
      const mockCotizacion = {
        id_cotizacion: cotizacionId,
        id_empresa: empresaId,
        cliente: { nombre: 'Cliente Test' },
        items: [{ id_item_cotizacion: 1, producto: { nombre: 'Producto 1' } }],
      };

      // Configurar el mock
      mockPrismaService.cotizacion.findFirst.mockResolvedValue(mockCotizacion);

      // Ejecutar el método
      const result = await service.findOne(cotizacionId, empresaId);

      // Verificar
      expect(mockPrismaService.cotizacion.findFirst).toHaveBeenCalledWith({
        where: {
          id_cotizacion: cotizacionId,
          id_empresa: empresaId,
        },
        include: {
          cliente: true,
          items: {
            include: {
              producto: true,
            },
          },
        },
      });
      expect(result).toEqual(mockCotizacion);
    });

    it('should throw NotFoundException when cotización does not exist', async () => {
      // Datos mock
      const empresaId = 1;
      const cotizacionId = 99; // ID que no existe

      // Configurar el mock para devolver null (no encontrado)
      mockPrismaService.cotizacion.findFirst.mockResolvedValue(null);

      // Ejecutar el método y verificar que lanza excepción
      await expect(service.findOne(cotizacionId, empresaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new cotización with items', async () => {
      // Datos mock
      const empresaId = 1;
      const createCotizacionDto = {
        id_cliente: 1,
        fecha_validez: '2023-12-31',
        subtotal: 100,
        descuento: 10,
        igv: 18,
        total: 108,
        items: [
          {
            id_producto: 1,
            cantidad: 2,
            precio_unitario: 50,
            descuento: 0,
            subtotal: 100,
          },
        ],
        id_empresa: empresaId,
        fecha_emision: '2023-12-01',
        estado: EstadoCotizacion.PENDIENTE,
      };

      const mockCliente = {
        id_cliente: 1,
        nombre: 'Cliente Test',
      };

      const mockClienteEmpresa = {
        cliente_id: 1,
        empresa_id: empresaId,
      };

      const mockProducto = {
        id_producto: 1,
        nombre: 'Producto Test',
        precio: 50,
      };

      const mockCreatedCotizacion = {
        id_cotizacion: 1,
        ...createCotizacionDto,
        id_empresa: empresaId,
        fecha_emision: expect.any(Date),
        estado: EstadoCotizacion.PENDIENTE,
      };

      // Configurar los mocks
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockCliente);
      mockPrismaService.clienteEmpresa.findFirst.mockResolvedValue(
        mockClienteEmpresa,
      );
      mockPrismaService.productoServicio.findUnique.mockResolvedValue(
        mockProducto,
      );
      mockPrismaService.cotizacion.create.mockResolvedValue(
        mockCreatedCotizacion,
      );
      mockPrismaService.itemCotizacion.create.mockResolvedValue({});

      // Ejecutar el método
      const result = await service.create(empresaId, createCotizacionDto);

      // Verificar
      expect(mockPrismaService.cliente.findUnique).toHaveBeenCalledWith({
        where: { id_cliente: createCotizacionDto.id_cliente },
      });
      expect(mockPrismaService.clienteEmpresa.findFirst).toHaveBeenCalledWith({
        where: {
          cliente_id: createCotizacionDto.id_cliente,
          empresa_id: empresaId,
        },
      });
      expect(mockPrismaService.cotizacion.create).toHaveBeenCalled();
      expect(mockPrismaService.itemCotizacion.create).toHaveBeenCalledTimes(
        createCotizacionDto.items.length,
      );
      expect(result).toEqual(mockCreatedCotizacion);
    });

    it('should throw BadRequestException when client does not exist', async () => {
      // Datos mock
      const empresaId = 1;
      const createCotizacionDto = {
        id_cliente: 99, // Cliente que no existe
        fecha_validez: '2023-12-31',
        subtotal: 100,
        descuento: 10,
        igv: 18,
        total: 108,
        items: [],
        id_empresa: empresaId,
        fecha_emision: '2023-12-01',
        estado: EstadoCotizacion.PENDIENTE,
      };

      // Configurar el mock
      mockPrismaService.cliente.findUnique.mockResolvedValue(null);

      // Ejecutar y verificar
      await expect(
        service.create(empresaId, createCotizacionDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when client is not associated with the empresa', async () => {
      // Datos mock
      const empresaId = 1;
      const createCotizacionDto = {
        id_cliente: 1,
        fecha_validez: '2023-12-31',
        subtotal: 100,
        descuento: 10,
        igv: 18,
        total: 108,
        items: [],
        id_empresa: empresaId,
        fecha_emision: '2023-12-01',
        estado: EstadoCotizacion.PENDIENTE,
      };

      // Cliente existe pero no está asociado a la empresa
      mockPrismaService.cliente.findUnique.mockResolvedValue({ id_cliente: 1 });
      mockPrismaService.clienteEmpresa.findFirst.mockResolvedValue(null);

      // Ejecutar y verificar
      await expect(
        service.create(empresaId, createCotizacionDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update an existing cotización', async () => {
      // Datos mock
      const empresaId = 1;
      const cotizacionId = 1;
      const updateCotizacionDto = {
        estado: EstadoCotizacion.APROBADA,
        notas: 'Cotización actualizada',
      };

      const mockExistingCotizacion = {
        id_cotizacion: cotizacionId,
        id_empresa: empresaId,
        estado: EstadoCotizacion.PENDIENTE,
      };

      const mockUpdatedCotizacion = {
        ...mockExistingCotizacion,
        ...updateCotizacionDto,
      };

      // Configurar los mocks
      mockPrismaService.cotizacion.findFirst.mockResolvedValue(
        mockExistingCotizacion,
      );
      mockPrismaService.cotizacion.update.mockResolvedValue(
        mockUpdatedCotizacion,
      );

      // Ejecutar el método
      const result = await service.update(
        cotizacionId,
        empresaId,
        updateCotizacionDto,
      );

      // Verificar
      expect(mockPrismaService.cotizacion.findFirst).toHaveBeenCalledWith({
        where: {
          id_cotizacion: cotizacionId,
          id_empresa: empresaId,
        },
      });
      expect(mockPrismaService.cotizacion.update).toHaveBeenCalledWith({
        where: { id_cotizacion: cotizacionId },
        data: updateCotizacionDto,
      });
      expect(result).toEqual(mockUpdatedCotizacion);
    });

    it('should throw NotFoundException when cotización to update does not exist', async () => {
      // Datos mock
      const empresaId = 1;
      const cotizacionId = 99; // ID que no existe
      const updateCotizacionDto = { estado: EstadoCotizacion.APROBADA };

      // Configurar el mock
      mockPrismaService.cotizacion.findFirst.mockResolvedValue(null);

      // Ejecutar y verificar
      await expect(
        service.update(cotizacionId, empresaId, updateCotizacionDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a cotización', async () => {
      // Datos mock
      const empresaId = 1;
      const cotizacionId = 1;
      const mockCotizacion = {
        id_cotizacion: cotizacionId,
        id_empresa: empresaId,
      };

      // Configurar los mocks
      mockPrismaService.cotizacion.findFirst.mockResolvedValue(mockCotizacion);
      mockPrismaService.cotizacion.delete.mockResolvedValue(mockCotizacion);

      // Ejecutar el método
      const result = await service.remove(cotizacionId, empresaId);

      // Verificar
      expect(mockPrismaService.cotizacion.findFirst).toHaveBeenCalledWith({
        where: {
          id_cotizacion: cotizacionId,
          id_empresa: empresaId,
        },
      });
      expect(mockPrismaService.itemCotizacion.deleteMany).toHaveBeenCalledWith({
        where: {
          id_cotizacion: cotizacionId,
        },
      });
      expect(mockPrismaService.cotizacion.delete).toHaveBeenCalledWith({
        where: {
          id_cotizacion: cotizacionId,
        },
      });
      expect(result).toEqual(mockCotizacion);
    });

    it('should throw NotFoundException when cotización to remove does not exist', async () => {
      // Datos mock
      const empresaId = 1;
      const cotizacionId = 99; // ID que no existe

      // Configurar el mock
      mockPrismaService.cotizacion.findFirst.mockResolvedValue(null);

      // Ejecutar y verificar
      await expect(service.remove(cotizacionId, empresaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
