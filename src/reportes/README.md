# 📊 Módulo de Reportes - BusinessGo

## 🎯 Descripción General

El módulo de reportes de BusinessGo ha sido completamente refactorizado aplicando principios SOLID y patrones de diseño para proporcionar una solución escalable, mantenible y específicamente adaptada al contexto empresarial peruano. **Se mantienen las rutas originales** (`/reportes`) para evitar confusión y garantizar compatibilidad.

## 🏗️ Arquitectura Refactorizada

### Servicios Especializados (SRP)

```
src/reportes/
├── services/
│   ├── reportes-validation.service.ts    # Validaciones específicas Perú
│   ├── reportes-calculation.service.ts   # Cálculos financieros precisos
│   ├── base-reportes.service.ts          # Template Method Pattern
│   ├── reportes-refactored.service.ts    # Servicio principal mejorado
│   └── reportes.service.ts               # Servicio original (compatibilidad)
├── controllers/
│   └── reportes.controller.ts            # Controlador mejorado (/reportes)
├── dto/
│   ├── create-reporte-mejorado.dto.ts    # DTOs tipados específicos
│   └── [DTOs originales...]
├── interfaces/
│   ├── reporte-mejorado.interface.ts     # Interfaces tipadas completas
│   └── [Interfaces originales...]
└── tests/
    └── reportes-refactored.service.spec.ts # Tests unitarios
```

## 🚀 Inicio Rápido

### Instalación y Configuración

```bash
# El módulo está integrado automáticamente
# No requiere instalación adicional
```

### Uso Básico

```typescript
import { ReportesRefactoredService } from './reportes/services/reportes-refactored.service';
import { TipoReporte, FormatoReporte } from './reportes/dto/create-reporte-mejorado.dto';

// Inyectar el servicio
constructor(
  @Inject('REPORTES_SERVICE')
  private readonly reportesService: ReportesRefactoredService
) {}

// Generar reporte de ventas
const reporteVentas = await this.reportesService.generateReporteVentas({
  empresaId: 1,
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-01-31'),
  page: 1,
  limit: 100,
  formato: FormatoReporte.JSON,
  incluirMetricas: true,
  incluirConfiguracion: true,
  parametros: {
    agrupacion: 'DIA',
    incluirDetalles: true,
    estado: 'COMPLETADA'
  }
}, usuarioId);
```

## 📋 Tipos de Reportes Disponibles

### 1. Reporte de Ventas

```typescript
const reporteVentas = await reportesService.getReporteVentas(empresaId, params);
```

**Métricas incluidas:**

- Total ventas con/sin IGV
- Ticket promedio
- Crecimiento vs período anterior
- Top productos, clientes, categorías
- Análisis temporal por período

### 2. Reporte de Compras

```typescript
const reporteCompras = await reportesService.getReporteCompras(
  empresaId,
  params,
);
```

**Métricas incluidas:**

- Total compras con/sin IGV
- Costo promedio
- Top proveedores y productos
- Análisis de crecimiento

### 3. Reporte de Inventario

```typescript
const reporteInventario = await reportesService.getReporteInventario(
  empresaId,
  params,
);
```

**Métricas incluidas:**

- Valor total inventario
- Productos con stock bajo/crítico
- Rotación de inventario
- Alertas de stock

### 4. Reporte de Clientes

```typescript
const reporteClientes = await reportesService.getReporteClientes(
  empresaId,
  params,
);
```

**Métricas incluidas:**

- Segmentación de clientes
- Valor lifetime del cliente
- Frecuencia de compra
- Retención de clientes

### 5. Reporte de Productos

```typescript
const reporteProductos = await reportesService.getReporteProductos(
  empresaId,
  params,
);
```

**Métricas incluidas:**

- Rendimiento por producto
- Análisis de márgenes
- Top productos por ventas/margen
- Alertas de productos

### 6. Reporte Financiero

```typescript
const reporteFinanciero = await reportesService.getReporteFinanciero(
  empresaId,
  params,
);
```

**Métricas incluidas:**

- Flujo de efectivo
- Indicadores financieros
- Análisis de rentabilidad
- Proyecciones financieras

## 🇵🇪 Características Específicas para Perú

### Configuración Regional Automática

```typescript
const configuracionPeru = {
  moneda: 'PEN', // Soles peruanos
  zona_horaria: 'America/Lima', // Zona horaria de Perú
  formato_fecha: 'dd/MM/yyyy', // Formato peruano
  igv_rate: 0.18, // IGV 18%
  decimales_moneda: 2, // 2 decimales
  incluir_igv: true, // Incluir IGV por defecto
  idioma: 'es', // Español
};
```

### Validaciones Contextuales

- **RUC**: Validación de 11 dígitos exactos
- **Fechas**: Formato dd/MM/yyyy, zona horaria Lima
- **Montos**: Formateo automático en soles (S/)
- **IGV**: Cálculo automático del 18%
- **Límites empresariales**: Adaptados al mercado peruano

### Formateo Automático

```typescript
// Moneda
'S/ 1,234.56';

// Fechas
'25/12/2024';

// IGV
'IGV (18%): S/ 180.00';
```

## 🔧 API Endpoints

### Controlador Principal (`/reportes`)

```http
# Crear reporte mejorado
POST /reportes
Content-Type: application/json
{
  "nombre": "Reporte Ventas Diciembre",
  "tipo_reporte": "VENTAS",
  "parametros": {
    "agrupacion": "DIA",
    "incluirDetalles": true
  }
}

# Generar reporte de ventas
GET /reportes/ventas?fecha_inicio=2024-01-01&fecha_fin=2024-01-31&agrupar_por=mes

# Generar reporte de compras
GET /reportes/compras?fecha_inicio=2024-01-01&fecha_fin=2024-01-31&ruc_proveedor=20123456789

# Generar reporte de inventario
GET /reportes/inventario?incluir_bajos=true&umbral_minimo=10

# Generar reporte de clientes
GET /reportes/clientes?tipo_cliente=corporativo&incluir_compras=true

# Generar reporte de productos
GET /reportes/productos?categoria_id=1&incluir_stock=true&incluir_ventas=true

# Generar reporte financiero
GET /reportes/financiero?tipo=general&incluir_impuestos=true

# Obtener historial de reportes
GET /reportes/historial?page=1&limit=10&tipo_reporte=VENTAS

# Obtener todos los reportes
GET /reportes

# Obtener detalles de reporte específico
GET /reportes/:id

# Ejecutar reporte programado
POST /reportes/:id/ejecutar
```

## 📊 Estructura de Respuesta

### Respuesta Estándar

```typescript
interface IReporteResponse<T> {
  data: T[]; // Datos del reporte
  metadata: {
    // Metadata de paginación
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metricas?: any; // Métricas calculadas
  configuracion?: IConfiguracionPeruana; // Configuración regional
  fecha_generacion: Date; // Fecha de generación
  tiempo_ejecucion_ms?: number; // Tiempo de ejecución
}
```

### Ejemplo Respuesta Ventas

```json
{
  "data": [
    {
      "id_orden_venta": 1,
      "numero_orden": "V-2024-001",
      "fecha_emision": "2024-01-15T00:00:00.000Z",
      "subtotal": "1000.00",
      "igv": "180.00",
      "total": "1180.00",
      "estado": "COMPLETADA",
      "cliente": {
        "nombre": "Cliente Test",
        "tipo_cliente": "PERSONA_NATURAL"
      },
      "total_formateado": "S/ 1,180.00",
      "fecha_emision_formateada": "15/01/2024"
    }
  ],
  "metadata": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "metricas": {
    "totalVentas": "1180.00",
    "totalVentasSinIGV": "1000.00",
    "igvTotal": "180.00",
    "ticketPromedio": "1180.00",
    "cantidadOrdenes": 1,
    "porcentajeIGV": "18.00",
    "totalVentas_formateado": "S/ 1,180.00"
  },
  "configuracion": {
    "moneda": "PEN",
    "zona_horaria": "America/Lima",
    "igv_rate": 0.18,
    "idioma": "es"
  },
  "fecha_generacion": "2024-12-25T10:30:00.000Z",
  "tiempo_ejecucion_ms": 245
}
```

## 🔒 Validaciones y Seguridad

### Validaciones Automáticas

- **Empresa existe y está activa**
- **Usuario pertenece a la empresa**
- **Permisos específicos por tipo de reporte**
- **Límites empresariales** (50 reportes/día, 10,000 registros máx)
- **Rango de fechas válido** (máx 365 días)
- **Parámetros específicos por tipo de reporte**

### Límites Empresariales

```typescript
const LIMITES_EMPRESARIALES = {
  MAX_REPORTES_POR_DIA: 50,
  MAX_REGISTROS_POR_REPORTE: 10000,
  MAX_DIAS_RANGO_FECHAS: 365,
  TIMEOUT_EJECUCION_MS: 300000, // 5 minutos
};
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests unitarios
npm run test src/reportes/tests/reportes-refactored.service.spec.ts

# Tests con coverage
npm run test:cov src/reportes/

# Tests e2e
npm run test:e2e -- --testNamePattern="Reportes"
```

### Estructura de Tests

```typescript
describe('ReportesRefactoredService', () => {
  describe('generateReporteVentas', () => {
    it('should generate ventas report successfully');
    it('should throw BadRequestException for invalid date range');
    it('should handle empty results gracefully');
    it('should apply correct pagination');
    it('should format data according to Peruvian context');
  });
});
```

## 🚀 Patrones de Diseño Implementados

### 1. Template Method Pattern

```typescript
// BaseReportesService
async generateReporte<T>(query, usuarioId, tipoReporte): Promise<IReporteResponse<T>> {
  // 1. Validaciones previas
  await this.validateReporteRequest(query, usuarioId, tipoReporte);

  // 2. Preparar configuración
  const configuracion = await this.prepareReporteConfiguration(query.empresaId);

  // 3. Ejecutar consulta específica (método abstracto)
  const data = await this.executeReporteQuery(query);

  // 4. Calcular métricas específicas (método abstracto)
  const metricas = await this.calculateReporteMetrics(query);

  // 5. Aplicar formateo específico para Perú
  const dataFormateada = this.formatReporteData(data, configuracion);

  return { data: dataFormateada, metadata, metricas, configuracion };
}
```

### 2. Strategy Pattern

```typescript
// Validaciones específicas por tipo
validateParametrosReporte(tipoReporte: string, parametros: any): void {
  switch (tipoReporte) {
    case TipoReporte.VENTAS:
      return this.validateParametrosVentas(parametros);
    case TipoReporte.COMPRAS:
      return this.validateParametrosCompras(parametros);
    // ... otros tipos
  }
}
```

### 3. Dependency Injection

```typescript
@Module({
  providers: [
    {
      provide: 'REPORTES_SERVICE',
      useClass: ReportesRefactoredService, // Servicio mejorado por defecto
    },
  ],
})
```

## 📈 Métricas y Monitoreo

### Logging Estructurado

```typescript
this.logger.log(`Reporte ${tipoReporte} generado exitosamente`, {
  empresaId: query.empresaId,
  usuarioId,
  registros: data.length,
  tiempoEjecucion: Date.now() - startTime,
  metricas: {
    totalVentas: metricas.totalVentas.toString(),
    cantidadOrdenes: metricas.cantidadOrdenes,
  },
});
```

### Métricas de Performance

- **Tiempo de ejecución** por tipo de reporte
- **Cantidad de registros** procesados
- **Uso de memoria** durante generación
- **Errores y excepciones** categorizados

## 🔄 Compatibilidad y Migración

### Mantenimiento de Rutas Originales

- **Rutas `/reportes`** mantienen funcionalidad completa
- **Implementación mejorada** sin cambios en la API externa
- **Migración transparente** sin interrupciones

### Mejoras Implementadas

| Característica   | Antes     | Después                     |
| ---------------- | --------- | --------------------------- |
| **Validaciones** | Básicas   | Robustas + contexto peruano |
| **Cálculos**     | Simples   | Precisos con Decimal        |
| **Formateo**     | Genérico  | Específico para Perú        |
| **Interfaces**   | Básicas   | Tipadas completamente       |
| **Métricas**     | Limitadas | Completas por tipo          |
| **Logging**      | Básico    | Estructurado                |
| **Paginación**   | Manual    | Automática con metadata     |
| **Errores**      | Genéricos | Específicos y descriptivos  |

## 🛠️ Desarrollo y Contribución

### Agregar Nuevo Tipo de Reporte

1. **Crear DTO específico**

```typescript
export class ReporteNuevoTipoParamsDto {
  @IsOptional()
  @IsString()
  parametroEspecifico?: string;
}
```

2. **Agregar interfaces**

```typescript
export interface INuevoTipoReporte {
  // Definir estructura
}

export interface IMetricasNuevoTipo {
  // Definir métricas
}
```

3. **Implementar métodos en servicios**

```typescript
// En ReportesRefactoredService
async executeNuevoTipoQuery(query: IReporteQuery): Promise<any[]> {
  // Implementar consulta específica
}

// En ReportesCalculationService
async calculateMetricasNuevoTipo(data: any[], parametros: any): Promise<IMetricasNuevoTipo> {
  // Implementar cálculos específicos
}
```

4. **Agregar endpoint en controlador**

```typescript
@Get('nuevo-tipo')
async generarReporteNuevoTipo(@Query() query: ReporteQueryMejoradoDto) {
  // Implementar endpoint
}
```

### Mejores Prácticas

1. **Siempre usar Decimal** para cálculos monetarios
2. **Validar contexto peruano** (RUC, IGV, formatos)
3. **Aplicar límites empresariales** en todas las consultas
4. **Logging estructurado** para trazabilidad
5. **Tests unitarios** para cada funcionalidad nueva
6. **Documentación OpenAPI** completa
7. **Mantener compatibilidad** con rutas existentes

## 📚 Referencias

- [Documentación Prisma](https://www.prisma.io/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Decimal.js Documentation](https://mikemcl.github.io/decimal.js/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Template Method Pattern](https://refactoring.guru/design-patterns/template-method)

## 🆘 Soporte

Para soporte técnico o preguntas sobre el módulo de reportes:

1. **Revisar documentación** completa
2. **Ejecutar tests** para verificar funcionalidad
3. **Consultar logs** para debugging
4. **Crear issue** con detalles específicos

---

**Módulo de Reportes BusinessGo** - Refactorizado con ❤️ para el mercado peruano, manteniendo compatibilidad total
