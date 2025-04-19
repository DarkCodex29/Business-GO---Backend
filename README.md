# BusinessGo - Backend de Sistema de Gestión Empresarial

[![NestJS](https://img.shields.io/badge/NestJS-^11.0-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-^5.7-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Requerido-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-^6.6-darkblue.svg)](https://www.prisma.io/)
[![AWS S3](https://img.shields.io/badge/AWS_S3-Integrado-orange.svg)](https://aws.amazon.com/s3/)

<div align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
  <img src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" width="120" alt="TypeScript Logo" />
  <img src="https://www.postgresql.org/media/img/about/press/elephant.png" width="120" alt="PostgreSQL Logo" />
  <img src="https://prismalens.vercel.app/header/logo-dark.svg" width="120" alt="Prisma Logo" />
  <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" width="120" alt="AWS Logo" />
</div>

Backend robusto desarrollado con NestJS para la gestión integral de empresas. Este proyecto implementa funcionalidades clave como autenticación JWT, gestión de usuarios, roles, permisos, empresas, gestión de ventas, productos, inventario, documentos comerciales y más.

## 📋 Características Principales

### 🔐 Seguridad y Autenticación

- **Sistema de Autenticación Robusto:**
  - Registro e inicio de sesión con JWT (Access y Refresh Tokens)
  - Guards para protección de rutas
  - Middleware para validación de tokens
  - Sistema de Roles y Permisos granular
  - Decorador `@Public()` para rutas públicas
  - Gestión de sesiones de usuario
  - Revocación de tokens (Logout)
  - Protección CORS configurable
  - Hashing de contraseñas con bcrypt

### 👥 Gestión de Usuarios y Empresas

- **Usuarios:**
  - CRUD completo de usuarios
  - Cambio y recuperación de contraseña
  - Asignación a empresas
  - Gestión de perfiles
  - Historial de actividades
- **Empresas:**
  - CRUD completo de empresas
  - Gestión de direcciones
  - Asignación de usuarios
  - Configuración de roles por empresa

### 📦 Gestión de Productos e Inventario

- **Productos:**
  - Catálogo completo de productos
  - Categorización y atributos
  - Gestión de precios y descuentos
  - Control de stock
  - Imágenes y multimedia
- **Inventario:**
  - Control de stock en tiempo real
  - Alertas de stock bajo
  - Historial de movimientos
  - Múltiples almacenes

### 💰 Gestión de Ventas y Finanzas

- **Ventas:**
  - Cotizaciones
  - Órdenes de venta
  - Facturación electrónica
  - Notas de crédito y débito
  - Reembolsos
- **Pagos:**
  - Múltiples métodos de pago
  - Registro de transacciones
  - Historial de pagos
  - Gestión de reembolsos

### 📄 Gestión Documental

- **Documentos Comerciales:**
  - Facturas
  - Boletas
  - Notas de crédito/débito
  - Guías de remisión
  - Cotizaciones
- **Archivos Multimedia:**
  - Carga y gestión de archivos
  - Versionamiento de documentos
  - Categorización
  - Metadatos y etiquetas

### 📊 Reportes y Análisis

- **Reportes Financieros:**
  - Ventas por período
  - Estado de pagos
  - Rentabilidad
- **Reportes de Inventario:**
  - Stock actual
  - Movimientos
  - Valorización

### 🛠️ Características Técnicas

- **Gestión de Archivos:**
  - Integración con AWS S3
  - Procesamiento de imágenes con Sharp
  - Conversión a WebP
  - Versionamiento de archivos
- **Comunicaciones:**
  - Integración con Resend para emails
  - Plantillas de correo personalizables
  - Notificaciones automáticas
- **Base de Datos:**
  - PostgreSQL con Prisma ORM
  - Migraciones automáticas
  - Relaciones complejas
  - Transacciones
- **API y Documentación:**
  - Swagger UI completo
  - DTOs validados
  - Respuestas tipadas
  - Ejemplos de uso

## 🚀 Puesta en Marcha

### Requisitos Previos

- Node.js (v18 o superior)
- npm (o yarn)
- PostgreSQL (v14 o superior)
- Base de datos PostgreSQL creada
- Credenciales AWS (S3)
- API Key de Resend

### Pasos de Instalación

1. **Clonar el repositorio:**

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd business-go
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**

   ```bash
   cp .env.example .env
   # Editar .env con tus valores
   ```

4. **Aplicar Migraciones:**

   ```bash
   npx prisma migrate dev
   ```

5. **Inicializar Roles y Permisos:**

   ```bash
   npx nest start --entryFile init-permisos
   ```

6. **Ejecutar la Aplicación:**

   ```bash
   # Desarrollo
   npm run start:dev

   # Producción
   npm run build
   npm run start:prod
   ```

## 🏗️ Estructura del Proyecto

```
src/
├── main.ts                 # Punto de entrada
├── app.module.ts           # Módulo raíz
├── auth/                   # Autenticación y autorización
├── users/                  # Gestión de usuarios
├── empresas/              # Gestión de empresas
├── productos/             # Gestión de productos
│   ├── controllers/       # Controladores de productos
│   ├── services/         # Servicios de productos
│   └── dto/              # DTOs de productos
├── ventas/               # Gestión de ventas
│   ├── controllers/      # Controladores de ventas
│   ├── services/        # Servicios de ventas
│   └── dto/             # DTOs de ventas
├── archivos/             # Gestión de archivos
├── common/               # Utilidades comunes
└── config/              # Configuraciones
```

## 📝 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 👤 Contacto

Gianpierre Mio - gianxs296@gmail.com

Link del Proyecto: [https://github.com/DarkCodex29/Business-GO---Backend](https://github.com/DarkCodex29/Business-GO---Backend)
