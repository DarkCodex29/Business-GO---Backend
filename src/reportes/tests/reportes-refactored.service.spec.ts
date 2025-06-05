import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

import { ReportesRefactoredService } from '../services/reportes-refactored.service';
import { ReportesValidationService } from '../services/reportes-validation.service';
import { ReportesCalculationService } from '../services/reportes-calculation.service';
import { PrismaService } from '../../prisma/prisma.service';

import {
  TipoReporte,
  FormatoReporte,
  PeriodoAgrupacion,
} from '../dto/create-reporte-mejorado.dto';

import {
  IReporteResponse,
  IVentaReporte,
  IMetricasVentasPeruanas,
  IConfiguracionPeruana,
} from '../interfaces/reporte-mejorado.interface';

describe('ReportesRefactoredService', () => {
  let service: ReportesRefactoredService;
  let validationService: ReportesValidationService;
  let calculationService: ReportesCalculationService;
  let prismaService: PrismaService;

  // Mocks de datos para testing
  const mockEmpresa = {
    id_empresa: 1,
    nombre: 'Empresa Test SAC',
    ruc: '20123456789',
    activo: true,
  };

  const mockUsuario = {
    id_usuario: 1,
    nombre: 'Usuario Test',
    email: 'test@empresa.com',
    activo: true,
  };

  const mockVentasData = [
    {
      id_orden_venta: 1,
      numero_orden: 'V-2024-001',
      fecha_emision: new Date('2024-01-15'),
      fecha_entrega: new Date('2024-01-16'),
      subtotal: new Decimal('1000.00'),
      descuento: new Decimal('0.00'),
      igv: new Decimal('180.00'),
      total: new Decimal('1180.00'),
      estado: 'COMPLETADA',
      notas: 'Venta de prueba',
      cliente: {
        id_cliente: 1,
        nombre: 'Cliente Test',
        email: 'cliente@test.com',
        telefono: '987654321',
        tipo_cliente: 'PERSONA_NATURAL',
        documento: '12345678',
        tipo_documento: 'DNI',
      },
      items: [
        {
          id_item: 1,
          cantidad: 2,
          precio_unitario: new Decimal('500.00'),
          descuento: new Decimal('0.00'),
          subtotal: new Decimal('1000.00'),
          producto: {
            id_producto: 1,
            nombre: 'Producto Test',
            codigo: 'PROD-001',
            categoria: { nombre: 'Categoría Test' },
            subcategoria: { nombre: 'Subcategoría Test' },
          },
        },
      ],
      factura: {
        id_factura: 1,
        numero_factura: 'F001-00000001',
        fecha_emision: new Date('2024-01-15'),
        estado: 'EMITIDA',
        total: new Decimal('1180.00'),
      },
    },
  ];

  const mockMetricasVentas: IMetricasVentasPeruanas = {
    totalVentas: new Decimal('1180.00'),
    totalVentasSinIGV: new Decimal('1000.00'),
    igvTotal: new Decimal('180.00'),
    ticketPromedio: new Decimal('1180.00'),
    cantidadOrdenes: 1,
    cantidadProductos: 1,
    cantidadClientes: 1,
    crecimientoVentas: new Decimal('0.00'),
    crecimientoOrdenes: new Decimal('0.00'),
    ventasPorPeriodo: [
      {
        periodo: '2024-01-15',
        total: new Decimal('1180.00'),
        cantidad: 1,
        total_formateado: 'S/ 1,180.00',
      },
    ],
    topProductos: [
      {
        id_producto: 1,
        nombre: 'Producto Test',
        categoria: 'Categoría Test',
        cantidad_vendida: 2,
        total_ventas: new Decimal('1000.00'),
        porcentaje_total: new Decimal('100.00'),
        total_ventas_formateado: 'S/ 1,000.00',
      },
    ],
    topClientes: [
      {
        id_cliente: 1,
        nombre: 'Cliente Test',
        tipo_cliente: 'PERSONA_NATURAL',
        cantidad_ordenes: 1,
        total_compras: new Decimal('1180.00'),
        ticket_promedio: new Decimal('1180.00'),
        porcentaje_total: new Decimal('100.00'),
        total_compras_formateado: 'S/ 1,180.00',
        ticket_promedio_formateado: 'S/ 1,180.00',
      },
    ],
    topCategorias: [
      {
        categoria: 'Categoría Test',
        cantidad_productos: 1,
        total_ventas: new Decimal('1000.00'),
        porcentaje_total: new Decimal('100.00'),
        total_ventas_formateado: 'S/ 1,000.00',
      },
    ],
    porcentajeIGV: new Decimal('18.00'),
    ventasContado: new Decimal('1180.00'),
    ventasCredito: new Decimal('0.00'),
    totalVentas_formateado: 'S/ 1,180.00',
    totalVentasSinIGV_formateado: 'S/ 1,000.00',
    igvTotal_formateado: 'S/ 180.00',
    ticketPromedio_formateado: 'S/ 1,180.00',
  };

  const mockConfiguracionPeruana: IConfiguracionPeruana = {
    moneda: 'PEN',
    zona_horaria: 'America/Lima',
    formato_fecha: 'dd/MM/yyyy',
    igv_rate: 0.18,
    decimales_moneda: 2,
    incluir_igv: true,
    idioma: 'es',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesRefactoredService,
        {
          provide: ReportesValidationService,
          useValue: {
            validateEmpresaExists: jest.fn(),
            validateUsuarioEmpresa: jest.fn(),
            validateFechasReporte: jest.fn(),
            validateParametrosVentas: jest.fn(),
            validatePermisoReporte: jest.fn(),
            validateLimitesEmpresariales: jest.fn(),
          },
        },
        {
          provide: ReportesCalculationService,
          useValue: {
            calculateMetricasVentas: jest.fn(),
            calculateMetricasCompras: jest.fn(),
            calculateMetricasInventario: jest.fn(),
            calculateMetricasClientes: jest.fn(),
            calculateMetricasProductos: jest.fn(),
            calculateMetricasFinancieras: jest.fn(),
            formatCurrencyPeru: jest.fn(),
            formatDatePeru: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            empresa: {
              findUnique: jest.fn(),
            },
            usuario: {
              findUnique: jest.fn(),
            },
            ordenVenta: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            ordenCompra: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            producto: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            cliente: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportesRefactoredService>(ReportesRefactoredService);
    validationService = module.get<ReportesValidationService>(
      ReportesValidationService,
    );
    calculationService = module.get<ReportesCalculationService>(
      ReportesCalculationService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReporteVentas', () => {
    const queryVentas = {
      empresaId: 1,
      fechaInicio: new Date('2024-01-01'),
      fechaFin: new Date('2024-01-31'),
      page: 1,
      limit: 10,
      formato: FormatoReporte.JSON,
      incluirMetricas: true,
      incluirConfiguracion: true,
      parametros: {
        agrupacion: PeriodoAgrupacion.DIA,
        incluirDetalles: true,
        estado: 'COMPLETADA',
      },
    };

    it('should generate ventas report successfully', async () => {
      // Arrange
      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest.spyOn(validationService, 'validateFechasReporte').mockReturnValue();
      jest
        .spyOn(validationService, 'validateParametrosVentas')
        .mockReturnValue();
      jest
        .spyOn(validationService, 'validatePermisoReporte')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateLimitesEmpresariales')
        .mockResolvedValue();

      jest
        .spyOn(prismaService.ordenVenta, 'findMany')
        .mockResolvedValue(mockVentasData);
      jest.spyOn(prismaService.ordenVenta, 'count').mockResolvedValue(1);

      jest
        .spyOn(calculationService, 'calculateMetricasVentas')
        .mockResolvedValue(mockMetricasVentas);
      jest
        .spyOn(calculationService, 'formatCurrencyPeru')
        .mockReturnValue('S/ 1,180.00');
      jest
        .spyOn(calculationService, 'formatDatePeru')
        .mockReturnValue('15/01/2024');

      // Act
      const result = await service.generateReporteVentas(
        queryVentas,
        mockUsuario.id_usuario,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.metadata.total).toBe(1);
      expect(result.metricas).toEqual(mockMetricasVentas);
      expect(result.configuracion?.moneda).toBe('PEN');
      expect(result.configuracion?.igv_rate).toBe(0.18);

      // Verify validations were called
      expect(validationService.validateEmpresaExists).toHaveBeenCalledWith(
        queryVentas.empresaId,
      );
      expect(validationService.validateUsuarioEmpresa).toHaveBeenCalledWith(
        mockUsuario.id_usuario,
        queryVentas.empresaId,
      );
      expect(validationService.validateFechasReporte).toHaveBeenCalledWith(
        queryVentas.fechaInicio,
        queryVentas.fechaFin,
      );
      expect(validationService.validateParametrosVentas).toHaveBeenCalledWith(
        queryVentas.parametros,
      );
      expect(validationService.validatePermisoReporte).toHaveBeenCalledWith(
        mockUsuario.id_usuario,
        queryVentas.empresaId,
        TipoReporte.VENTAS,
      );

      // Verify calculations were called
      expect(calculationService.calculateMetricasVentas).toHaveBeenCalledWith(
        mockVentasData,
        queryVentas.parametros,
      );
    });

    it('should throw BadRequestException for invalid date range', async () => {
      // Arrange
      const invalidQuery = {
        ...queryVentas,
        fechaInicio: new Date('2024-01-31'),
        fechaFin: new Date('2024-01-01'), // Fecha fin antes que inicio
      };

      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateFechasReporte')
        .mockImplementation(() => {
          throw new BadRequestException(
            'La fecha de inicio debe ser anterior a la fecha de fin',
          );
        });

      // Act & Assert
      await expect(
        service.generateReporteVentas(invalidQuery, mockUsuario.id_usuario),
      ).rejects.toThrow(BadRequestException);

      expect(validationService.validateFechasReporte).toHaveBeenCalledWith(
        invalidQuery.fechaInicio,
        invalidQuery.fechaFin,
      );
    });

    it('should throw NotFoundException for non-existing empresa', async () => {
      // Arrange
      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockImplementation(() => {
          throw new NotFoundException('Empresa no encontrada');
        });

      // Act & Assert
      await expect(
        service.generateReporteVentas(queryVentas, mockUsuario.id_usuario),
      ).rejects.toThrow(NotFoundException);

      expect(validationService.validateEmpresaExists).toHaveBeenCalledWith(
        queryVentas.empresaId,
      );
    });

    it('should throw ForbiddenException for insufficient permissions', async () => {
      // Arrange
      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest.spyOn(validationService, 'validateFechasReporte').mockReturnValue();
      jest
        .spyOn(validationService, 'validateParametrosVentas')
        .mockReturnValue();
      jest
        .spyOn(validationService, 'validatePermisoReporte')
        .mockImplementation(() => {
          throw new ForbiddenException(
            'No tiene permisos para generar reportes de ventas',
          );
        });

      // Act & Assert
      await expect(
        service.generateReporteVentas(queryVentas, mockUsuario.id_usuario),
      ).rejects.toThrow(ForbiddenException);

      expect(validationService.validatePermisoReporte).toHaveBeenCalledWith(
        mockUsuario.id_usuario,
        queryVentas.empresaId,
        TipoReporte.VENTAS,
      );
    });

    it('should handle empty results gracefully', async () => {
      // Arrange
      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest.spyOn(validationService, 'validateFechasReporte').mockReturnValue();
      jest
        .spyOn(validationService, 'validateParametrosVentas')
        .mockReturnValue();
      jest
        .spyOn(validationService, 'validatePermisoReporte')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateLimitesEmpresariales')
        .mockResolvedValue();

      jest.spyOn(prismaService.ordenVenta, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.ordenVenta, 'count').mockResolvedValue(0);

      const emptyMetricas: IMetricasVentasPeruanas = {
        ...mockMetricasVentas,
        totalVentas: new Decimal('0.00'),
        totalVentasSinIGV: new Decimal('0.00'),
        igvTotal: new Decimal('0.00'),
        ticketPromedio: new Decimal('0.00'),
        cantidadOrdenes: 0,
        cantidadProductos: 0,
        cantidadClientes: 0,
        ventasPorPeriodo: [],
        topProductos: [],
        topClientes: [],
        topCategorias: [],
      };

      jest
        .spyOn(calculationService, 'calculateMetricasVentas')
        .mockResolvedValue(emptyMetricas);

      // Act
      const result = await service.generateReporteVentas(
        queryVentas,
        mockUsuario.id_usuario,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(0);
      expect(result.metadata.total).toBe(0);
      expect(result.metricas.cantidadOrdenes).toBe(0);
      expect(result.metricas.totalVentas.toString()).toBe('0.00');
    });

    it('should apply correct pagination', async () => {
      // Arrange
      const paginatedQuery = {
        ...queryVentas,
        page: 2,
        limit: 5,
      };

      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest.spyOn(validationService, 'validateFechasReporte').mockReturnValue();
      jest
        .spyOn(validationService, 'validateParametrosVentas')
        .mockReturnValue();
      jest
        .spyOn(validationService, 'validatePermisoReporte')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateLimitesEmpresariales')
        .mockResolvedValue();

      jest
        .spyOn(prismaService.ordenVenta, 'findMany')
        .mockResolvedValue(mockVentasData);
      jest.spyOn(prismaService.ordenVenta, 'count').mockResolvedValue(15); // Total 15 registros

      jest
        .spyOn(calculationService, 'calculateMetricasVentas')
        .mockResolvedValue(mockMetricasVentas);

      // Act
      const result = await service.generateReporteVentas(
        paginatedQuery,
        mockUsuario.id_usuario,
      );

      // Assert
      expect(result.metadata.page).toBe(2);
      expect(result.metadata.limit).toBe(5);
      expect(result.metadata.total).toBe(15);
      expect(result.metadata.totalPages).toBe(3);
      expect(result.metadata.hasNext).toBe(true);
      expect(result.metadata.hasPrev).toBe(true);

      // Verify correct skip and take were used
      expect(prismaService.ordenVenta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page - 1) * limit = (2 - 1) * 5 = 5
          take: 5,
        }),
      );
    });

    it('should format data according to Peruvian context', async () => {
      // Arrange
      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest.spyOn(validationService, 'validateFechasReporte').mockReturnValue();
      jest
        .spyOn(validationService, 'validateParametrosVentas')
        .mockReturnValue();
      jest
        .spyOn(validationService, 'validatePermisoReporte')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateLimitesEmpresariales')
        .mockResolvedValue();

      jest
        .spyOn(prismaService.ordenVenta, 'findMany')
        .mockResolvedValue(mockVentasData);
      jest.spyOn(prismaService.ordenVenta, 'count').mockResolvedValue(1);

      jest
        .spyOn(calculationService, 'calculateMetricasVentas')
        .mockResolvedValue(mockMetricasVentas);
      jest
        .spyOn(calculationService, 'formatCurrencyPeru')
        .mockReturnValue('S/ 1,180.00');
      jest
        .spyOn(calculationService, 'formatDatePeru')
        .mockReturnValue('15/01/2024');

      // Act
      const result = await service.generateReporteVentas(
        queryVentas,
        mockUsuario.id_usuario,
      );

      // Assert
      expect(result.configuracion).toBeDefined();
      expect(result.configuracion?.moneda).toBe('PEN');
      expect(result.configuracion?.zona_horaria).toBe('America/Lima');
      expect(result.configuracion?.formato_fecha).toBe('dd/MM/yyyy');
      expect(result.configuracion?.igv_rate).toBe(0.18);
      expect(result.configuracion?.decimales_moneda).toBe(2);
      expect(result.configuracion?.idioma).toBe('es');

      // Verify formatting functions were called
      expect(calculationService.formatCurrencyPeru).toHaveBeenCalled();
      expect(calculationService.formatDatePeru).toHaveBeenCalled();
    });
  });

  describe('executeVentasQuery', () => {
    it('should build correct query with all filters', async () => {
      // Arrange
      const query = {
        empresaId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-31'),
        page: 1,
        limit: 10,
        parametros: {
          agrupacion: PeriodoAgrupacion.DIA,
          incluirDetalles: true,
          estado: 'COMPLETADA',
          montoMinimo: 100,
          montoMaximo: 5000,
        },
      };

      jest
        .spyOn(prismaService.ordenVenta, 'findMany')
        .mockResolvedValue(mockVentasData);

      // Act
      await service.executeVentasQuery(query);

      // Assert
      expect(prismaService.ordenVenta.findMany).toHaveBeenCalledWith({
        where: {
          id_empresa: 1,
          fecha_emision: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
          estado: 'COMPLETADA',
          total: {
            gte: new Decimal('100'),
            lte: new Decimal('5000'),
          },
        },
        include: {
          cliente: true,
          items: {
            include: {
              producto: {
                include: {
                  categoria: true,
                  subcategoria: true,
                },
              },
            },
          },
          facturas: true,
        },
        orderBy: {
          fecha_emision: 'desc',
        },
        skip: 0,
        take: 10,
      });
    });

    it('should handle query without optional parameters', async () => {
      // Arrange
      const minimalQuery = {
        empresaId: 1,
        page: 1,
        limit: 10,
        parametros: {},
      };

      jest
        .spyOn(prismaService.ordenVenta, 'findMany')
        .mockResolvedValue(mockVentasData);

      // Act
      await service.executeVentasQuery(minimalQuery);

      // Assert
      expect(prismaService.ordenVenta.findMany).toHaveBeenCalledWith({
        where: {
          id_empresa: 1,
        },
        include: {
          cliente: true,
          items: {
            include: {
              producto: {
                include: {
                  categoria: true,
                  subcategoria: true,
                },
              },
            },
          },
          facturas: true,
        },
        orderBy: {
          fecha_emision: 'desc',
        },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('countVentasRecords', () => {
    it('should count records with correct filters', async () => {
      // Arrange
      const query = {
        empresaId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-31'),
        parametros: {
          estado: 'COMPLETADA',
        },
      };

      jest.spyOn(prismaService.ordenVenta, 'count').mockResolvedValue(25);

      // Act
      const count = await service.countVentasRecords(query);

      // Assert
      expect(count).toBe(25);
      expect(prismaService.ordenVenta.count).toHaveBeenCalledWith({
        where: {
          id_empresa: 1,
          fecha_emision: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
          estado: 'COMPLETADA',
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest.spyOn(validationService, 'validateFechasReporte').mockReturnValue();
      jest
        .spyOn(validationService, 'validateParametrosVentas')
        .mockReturnValue();
      jest
        .spyOn(validationService, 'validatePermisoReporte')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateLimitesEmpresariales')
        .mockResolvedValue();

      jest
        .spyOn(prismaService.ordenVenta, 'findMany')
        .mockRejectedValue(new Error('Database connection failed'));

      const queryVentas = {
        empresaId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-31'),
        page: 1,
        limit: 10,
        formato: FormatoReporte.JSON,
        incluirMetricas: true,
        parametros: {},
      };

      // Act & Assert
      await expect(
        service.generateReporteVentas(queryVentas, mockUsuario.id_usuario),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle calculation service errors', async () => {
      // Arrange
      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest.spyOn(validationService, 'validateFechasReporte').mockReturnValue();
      jest
        .spyOn(validationService, 'validateParametrosVentas')
        .mockReturnValue();
      jest
        .spyOn(validationService, 'validatePermisoReporte')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateLimitesEmpresariales')
        .mockResolvedValue();

      jest
        .spyOn(prismaService.ordenVenta, 'findMany')
        .mockResolvedValue(mockVentasData);
      jest.spyOn(prismaService.ordenVenta, 'count').mockResolvedValue(1);

      jest
        .spyOn(calculationService, 'calculateMetricasVentas')
        .mockRejectedValue(new Error('Calculation error'));

      const queryVentas = {
        empresaId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-31'),
        page: 1,
        limit: 10,
        formato: FormatoReporte.JSON,
        incluirMetricas: true,
        parametros: {},
      };

      // Act & Assert
      await expect(
        service.generateReporteVentas(queryVentas, mockUsuario.id_usuario),
      ).rejects.toThrow('Calculation error');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        ...mockVentasData[0],
        id_orden_venta: index + 1,
        numero_orden: `V-2024-${String(index + 1).padStart(3, '0')}`,
      }));

      jest
        .spyOn(validationService, 'validateEmpresaExists')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateUsuarioEmpresa')
        .mockResolvedValue();
      jest.spyOn(validationService, 'validateFechasReporte').mockReturnValue();
      jest
        .spyOn(validationService, 'validateParametrosVentas')
        .mockReturnValue();
      jest
        .spyOn(validationService, 'validatePermisoReporte')
        .mockResolvedValue();
      jest
        .spyOn(validationService, 'validateLimitesEmpresariales')
        .mockResolvedValue();

      jest
        .spyOn(prismaService.ordenVenta, 'findMany')
        .mockResolvedValue(largeDataset);
      jest.spyOn(prismaService.ordenVenta, 'count').mockResolvedValue(1000);

      jest
        .spyOn(calculationService, 'calculateMetricasVentas')
        .mockResolvedValue(mockMetricasVentas);

      const queryVentas = {
        empresaId: 1,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-31'),
        page: 1,
        limit: 1000,
        formato: FormatoReporte.JSON,
        incluirMetricas: true,
        parametros: {},
      };

      const startTime = Date.now();

      // Act
      const result = await service.generateReporteVentas(
        queryVentas,
        mockUsuario.id_usuario,
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1000);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.tiempo_ejecucion_ms).toBeDefined();
    });
  });
});

// ========================================
// TESTS PARA OTROS SERVICIOS ESPECIALIZADOS
// ========================================

describe('ReportesValidationService', () => {
  let validationService: ReportesValidationService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesValidationService,
        {
          provide: PrismaService,
          useValue: {
            empresa: {
              findUnique: jest.fn(),
            },
            usuario: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    validationService = module.get<ReportesValidationService>(
      ReportesValidationService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('validateEmpresaExists', () => {
    it('should pass for existing active empresa', async () => {
      // Arrange
      jest.spyOn(prismaService.empresa, 'findUnique').mockResolvedValue({
        id_empresa: 1,
        nombre: 'Empresa Test',
        activo: true,
      } as any);

      // Act & Assert
      await expect(
        validationService.validateEmpresaExists(1),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException for non-existing empresa', async () => {
      // Arrange
      jest.spyOn(prismaService.empresa, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        validationService.validateEmpresaExists(999),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive empresa', async () => {
      // Arrange
      jest.spyOn(prismaService.empresa, 'findUnique').mockResolvedValue({
        id_empresa: 1,
        nombre: 'Empresa Inactiva',
        activo: false,
      } as any);

      // Act & Assert
      await expect(validationService.validateEmpresaExists(1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateFechasReporte', () => {
    it('should pass for valid date range', () => {
      // Arrange
      const fechaInicio = new Date('2024-01-01');
      const fechaFin = new Date('2024-01-31');

      // Act & Assert
      expect(() =>
        validationService.validateFechasReporte(fechaInicio, fechaFin),
      ).not.toThrow();
    });

    it('should throw BadRequestException when start date is after end date', () => {
      // Arrange
      const fechaInicio = new Date('2024-01-31');
      const fechaFin = new Date('2024-01-01');

      // Act & Assert
      expect(() =>
        validationService.validateFechasReporte(fechaInicio, fechaFin),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for future dates', () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      // Act & Assert
      expect(() => validationService.validateFechasReporte(futureDate)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for date range exceeding 365 days', () => {
      // Arrange
      const fechaInicio = new Date('2023-01-01');
      const fechaFin = new Date('2024-01-02'); // Más de 365 días

      // Act & Assert
      expect(() =>
        validationService.validateFechasReporte(fechaInicio, fechaFin),
      ).toThrow(BadRequestException);
    });
  });

  describe('validateParametrosVentas', () => {
    it('should pass for valid ventas parameters', () => {
      // Arrange
      const parametros = {
        agrupacion: PeriodoAgrupacion.DIA,
        incluirDetalles: true,
        estado: 'COMPLETADA',
        montoMinimo: 100,
        montoMaximo: 5000,
      };

      // Act & Assert
      expect(() =>
        validationService.validateParametrosVentas(parametros),
      ).not.toThrow();
    });

    it('should throw BadRequestException for invalid agrupacion', () => {
      // Arrange
      const parametros = {
        agrupacion: 'INVALID' as any,
      };

      // Act & Assert
      expect(() =>
        validationService.validateParametrosVentas(parametros),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when montoMinimo > montoMaximo', () => {
      // Arrange
      const parametros = {
        montoMinimo: 5000,
        montoMaximo: 100,
      };

      // Act & Assert
      expect(() =>
        validationService.validateParametrosVentas(parametros),
      ).toThrow(BadRequestException);
    });
  });
});

describe('ReportesCalculationService', () => {
  let calculationService: ReportesCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportesCalculationService],
    }).compile();

    calculationService = module.get<ReportesCalculationService>(
      ReportesCalculationService,
    );
  });

  describe('calculateMetricasVentas', () => {
    it('should calculate ventas metrics correctly', async () => {
      // Arrange
      const ventasData = [
        {
          id_orden_venta: 1,
          total: new Decimal('1180.00'),
          subtotal: new Decimal('1000.00'),
          igv: new Decimal('180.00'),
          fecha_emision: new Date('2024-01-15'),
          cliente: { id_cliente: 1, nombre: 'Cliente 1' },
          items: [
            {
              cantidad: 2,
              producto: {
                id_producto: 1,
                nombre: 'Producto 1',
                categoria: { nombre: 'Cat 1' },
              },
            },
          ],
        },
        {
          id_orden_venta: 2,
          total: new Decimal('590.00'),
          subtotal: new Decimal('500.00'),
          igv: new Decimal('90.00'),
          fecha_emision: new Date('2024-01-16'),
          cliente: { id_cliente: 2, nombre: 'Cliente 2' },
          items: [
            {
              cantidad: 1,
              producto: {
                id_producto: 2,
                nombre: 'Producto 2',
                categoria: { nombre: 'Cat 2' },
              },
            },
          ],
        },
      ];

      const parametros = {
        agrupacion: PeriodoAgrupacion.DIA,
      };

      // Act
      const metricas = await calculationService.calculateMetricasVentas(
        ventasData,
        parametros,
      );

      // Assert
      expect(metricas.totalVentas.toString()).toBe('1770.00');
      expect(metricas.totalVentasSinIGV.toString()).toBe('1500.00');
      expect(metricas.igvTotal.toString()).toBe('270.00');
      expect(metricas.ticketPromedio.toString()).toBe('885.00');
      expect(metricas.cantidadOrdenes).toBe(2);
      expect(metricas.cantidadClientes).toBe(2);
      expect(metricas.porcentajeIGV.toString()).toBe('18.00');
    });

    it('should handle empty data gracefully', async () => {
      // Arrange
      const ventasData: any[] = [];
      const parametros = {};

      // Act
      const metricas = await calculationService.calculateMetricasVentas(
        ventasData,
        parametros,
      );

      // Assert
      expect(metricas.totalVentas.toString()).toBe('0.00');
      expect(metricas.cantidadOrdenes).toBe(0);
      expect(metricas.cantidadClientes).toBe(0);
      expect(metricas.topProductos).toHaveLength(0);
      expect(metricas.topClientes).toHaveLength(0);
    });
  });

  describe('formatCurrencyPeru', () => {
    it('should format currency in Peruvian format', () => {
      // Arrange
      const amount = new Decimal('1234.56');

      // Act
      const formatted = calculationService.formatCurrencyPeru(amount);

      // Assert
      expect(formatted).toBe('S/ 1,234.56');
    });

    it('should handle zero amount', () => {
      // Arrange
      const amount = new Decimal('0.00');

      // Act
      const formatted = calculationService.formatCurrencyPeru(amount);

      // Assert
      expect(formatted).toBe('S/ 0.00');
    });

    it('should handle large amounts', () => {
      // Arrange
      const amount = new Decimal('1234567.89');

      // Act
      const formatted = calculationService.formatCurrencyPeru(amount);

      // Assert
      expect(formatted).toBe('S/ 1,234,567.89');
    });
  });

  describe('formatDatePeru', () => {
    it('should format date in Peruvian format', () => {
      // Arrange
      const date = new Date('2024-01-15T10:30:00Z');

      // Act
      const formatted = calculationService.formatDatePeru(date);

      // Assert
      expect(formatted).toBe('15/01/2024');
    });
  });
});
