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

Backend robusto desarrollado con NestJS para la gestión integral de empresas. Este proyecto implementa funcionalidades clave como autenticación JWT, gestión de usuarios, roles, permisos, empresas, carga de archivos a S3 y envío de correos.

## 📋 Características Principales

- **Autenticación y Autorización:**
  - Registro e inicio de sesión con JWT (Access y Refresh Tokens).
  - Guards para proteger rutas.
  - Middleware para validación de tokens.
  - Sistema de Roles y Permisos granular (con inicialización vía comando).
  - Decorador `@Public()` para rutas públicas.
  - Gestión de sesiones de usuario.
  - Revocación de tokens (Logout).
- **Gestión de Usuarios:** CRUD completo, cambio de contraseña, asignación a empresas.
- **Gestión de Empresas:** CRUD completo, gestión de direcciones, asignación de usuarios.
- **Gestión de Roles y Permisos:** Definición de roles, permisos y asignación a usuarios y roles.
- **Carga de Archivos:** Carga de imágenes a AWS S3, procesamiento con Sharp (redimensionar, formato WebP), asociación con entidades (Usuarios, Empresas, Productos, Documentos).
- **Envío de Correos:** Integración con Resend para correos transaccionales (ej. reseteo de contraseña).
- **Base de Datos:** PostgreSQL con ORM Prisma, schema detallado y migraciones.
- **Documentación API:** Generación automática con Swagger UI accesible en `/api`.
- **Validación:** DTOs con `class-validator` y `class-transformer`.
- **Configuración:** Manejo centralizado con `@nestjs/config` y archivo `.env`.
- **Logging:** Logger integrado de NestJS.
- **Seguridad:** Hashing de contraseñas (bcrypt), CORS configurable, protección contra ataques comunes.

## 🚀 Puesta en Marcha

### Requisitos Previos

- Node.js (v18 o superior recomendado)
- npm (o yarn)
- PostgreSQL (v14 o superior recomendado)
- Una base de datos PostgreSQL creada.
- Credenciales de AWS (Access Key ID, Secret Access Key) con permisos para un bucket S3.
- Un bucket S3 creado en AWS.
- Una API Key de [Resend](https://resend.com/) para el envío de correos.

### Pasos de Instalación

1.  **Clonar el repositorio:**

    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd business-go
    ```

2.  **Instalar dependencias:**

    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**

    - Copia el archivo `.env.example` a `.env`:
      ```bash
      cp .env.example .env
      ```
    - Edita el archivo `.env` y rellena **TODAS** las variables con tus valores reales (URL de base de datos, secretos JWT, credenciales AWS S3, API Key de Resend, etc.). Revisa los comentarios en `.env.example` para más detalles.
    - **⚠️ IMPORTANTE:** Asegúrate de que el archivo `.env` nunca sea subido a tu repositorio Git.

4.  **Aplicar Migraciones de Base de Datos:**
    Asegúrate de que tu servidor PostgreSQL esté corriendo y que la `DATABASE_URL` en tu `.env` sea correcta.

    ```bash
    npx prisma migrate dev
    ```

    Esto aplicará las migraciones necesarias para crear la estructura de tablas definida en `prisma/schema.prisma`.

5.  **Inicializar Roles y Permisos (Opcional pero Recomendado):**
    Este comando ejecuta el script para crear roles y permisos básicos.

    ```bash
    npx nest start --entryFile init-permisos
    ```

    _Nota: Puede que necesites ajustar la configuración de `nest-commander` o la forma en que se ejecuta el script si encuentras problemas._

6.  **Ejecutar la Aplicación:**

    - **Modo Desarrollo (con hot-reloading):**
      ```bash
      npm run start:dev
      ```
    - **Modo Producción:**
      ```bash
      npm run build
      npm run start:prod
      ```

7.  **Acceder a la Documentación API:**
    Una vez que la aplicación esté corriendo (por defecto en `http://localhost:3000`), puedes acceder a la documentación interactiva de Swagger en `http://localhost:3000/api` (o la ruta que hayas configurado con `API_PREFIX`).

## ⚙️ Configuración Adicional

Revisa el archivo `.env.example` para ver todas las variables de configuración disponibles, incluyendo opciones para CORS, Rate Limiting, Logging, etc.

## 🏗️ Estructura del Proyecto

El proyecto sigue una arquitectura modular estándar de NestJS:

```
src/
├── main.ts         # Punto de entrada de la aplicación
├── app.module.ts     # Módulo raíz
├── prisma/         # Módulo y servicio de Prisma
├── config/         # Configuraciones (si aplica)
├── common/         # Elementos comunes (interceptors, decorators, etc.)
├── auth/           # Módulo de Autenticación y Autorización
├── users/          # Módulo de Gestión de Usuarios
├── empresas/       # Módulo de Gestión de Empresas
├── roles/          # Módulo de Gestión de Roles (si separado)
├── permisos/       # Módulo de Gestión de Permisos (si separado)
├── files/          # Módulo de Gestión de Archivos (S3)
├── email/          # Módulo de Envío de Correos
└── ...             # Otros módulos de funcionalidades
prisma/
├── schema.prisma   # Definición del schema de la base de datos
├── migrations/     # Directorio de migraciones generadas
└── seed.ts         # Script de seed (si aplica)
```

## 🛠️ Pila Tecnológica

- **Framework Backend:** [NestJS](https://nestjs.com/) (^11.0)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) (^5.7)
- **Base de Datos:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/) (^6.6)
- **Autenticación:** JWT (con `@nestjs/jwt`, `passport-jwt`)
- **Carga de Archivos:** [AWS SDK v3 for S3](https://aws.amazon.com/sdk-for-javascript/) (`@aws-sdk/client-s3`), [Multer](https://github.com/expressjs/multer), [Sharp](https://sharp.pixelplumbing.com/)
- **Envío de Correos:** [Resend](https://resend.com/)
- **Documentación API:** [Swagger](https://swagger.io/) (OpenAPI) via `@nestjs/swagger`
- **Validación:** `class-validator`, `class-transformer`
- **CLI Comandos:** `nest-commander`

## 📝 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 👤 Contacto

Gianpierre Mio - gianxs296@gmail.com

Link del Proyecto: [https://github.com/DarkCodex29/Business-GO---Backend](https://github.com/DarkCodex29/Business-GO---Backend)
