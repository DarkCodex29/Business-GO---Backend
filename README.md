# BusinessGo - Sistema de Gestión Empresarial

[![NestJS](https://img.shields.io/badge/NestJS-10.0+-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)

Sistema backend desarrollado con NestJS para la gestión integral de empresas. Proyecto personal que implementa un sistema robusto de autenticación, gestión de usuarios y envío de correos electrónicos.

## 📋 Características

- **Autenticación JWT**: Sistema seguro de autenticación con tokens de acceso y refresco
- **Gestión de usuarios**: Administración completa de usuarios y roles
- **Sistema de correos**: Integración con Resend para envío de correos electrónicos
- **API RESTful**: Endpoints bien documentados y seguros
- **Base de datos PostgreSQL**: Almacenamiento robusto y escalable
- **Documentación Swagger**: API documentada y fácil de probar
- **Sistema de logging**: Registro detallado de eventos y errores
- **Seguridad robusta**: Protección contra ataques comunes
- **Gestión de sesiones**: Control y seguimiento de sesiones de usuario
- **Modo desarrollo/producción**: Configuraciones optimizadas para cada entorno

## 🚀 Instalación

### Requisitos previos

- Node.js (v18 o superior)
- PostgreSQL (v14 o superior)
- npm o yarn
- Cuenta en Resend para envío de correos

### Pasos de instalación

1. Clona este repositorio:

   ```bash
   git clone https://github.com/tu-usuario/business-go.git
   cd business-go
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Configura las variables de entorno:

   - Copia el archivo `.env.example` a `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edita el archivo `.env` y completa con tus credenciales reales
   - **⚠️ IMPORTANTE**: Nunca subas el archivo `.env` con tus credenciales al repositorio

4. Configura la base de datos:

   ```bash
   # Generar migraciones
   npx prisma migrate dev

   # Poblar la base de datos con datos iniciales
   npx prisma db seed
   ```

5. Ejecuta la aplicación:

   ```bash
   # Desarrollo
   npm run start:dev

   # Producción
   npm run build
   npm run start:prod
   ```

## ⚙️ Configuración

### Variables de entorno

El proyecto utiliza un archivo `.env` para gestionar la configuración de forma segura:

| Variable                   | Descripción                     | Ejemplo                                                     |
| -------------------------- | ------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`             | URL de conexión a PostgreSQL    | `postgresql://usuario:contraseña@localhost:5432/businessgo` |
| `JWT_ACCESS_TOKEN_SECRET`  | Secreto para tokens de acceso   | `tu_secreto_seguro`                                         |
| `JWT_REFRESH_TOKEN_SECRET` | Secreto para tokens de refresco | `tu_secreto_seguro`                                         |
| `RESEND_API_KEY`           | API Key de Resend               | `re_xxxxx`                                                  |
| `FRONTEND_URL`             | URL del frontend                | `http://localhost:3000`                                     |

### ⚠️ Seguridad

Para garantizar la seguridad de las credenciales y datos sensibles:

- El archivo `.env` está incluido en `.gitignore`
- **NUNCA** guardes credenciales reales en el código fuente
- **NUNCA** incluyas información sensible en commits o PRs
- Utiliza servicios seguros para compartir credenciales
- Si crees que has expuesto accidentalmente alguna credencial, cámbiala inmediatamente

## 🏗️ Arquitectura

El proyecto sigue una arquitectura modular organizada por funcionalidades:

```
src/
├── auth/           # Autenticación y autorización
│   ├── guards/     # Guards de autenticación
│   ├── decorators/ # Decoradores personalizados
│   └── strategies/ # Estrategias de autenticación
├── users/          # Gestión de usuarios
├── email/          # Servicios de correo
├── prisma/         # Modelos y migraciones
└── config/         # Configuraciones
```

### Patrones y frameworks utilizados:

- **NestJS**: Framework principal para la construcción de la API
- **Prisma**: ORM para gestión de base de datos
- **JWT**: Para autenticación y autorización
- **Resend**: Para envío de correos electrónicos
- **Repository Pattern**: Para separar la lógica de acceso a datos
- **Service Pattern**: Para encapsular lógica de negocio reutilizable

## 📡 API Endpoints

### Autenticación

| Método | Ruta               | Descripción         |
| ------ | ------------------ | ------------------- |
| POST   | /api/auth/register | Registro de usuario |
| POST   | /api/auth/login    | Inicio de sesión    |
| POST   | /api/auth/logout   | Cierre de sesión    |
| GET    | /api/auth/profile  | Perfil de usuario   |
| POST   | /api/auth/refresh  | Refrescar token     |

### Usuarios

| Método | Ruta          | Descripción        |
| ------ | ------------- | ------------------ |
| GET    | /usuarios     | Listar usuarios    |
| GET    | /usuarios/:id | Obtener usuario    |
| POST   | /usuarios     | Crear usuario      |
| PATCH  | /usuarios/:id | Actualizar usuario |
| DELETE | /usuarios/:id | Eliminar usuario   |

## 📧 Sistema de Correos

El sistema utiliza Resend para el envío de correos:

- Correos de bienvenida
- Recuperación de contraseña
- Confirmación de citas
- Notificaciones del sistema

## 🔍 Logging

Sistema de logging configurable:

- Niveles de log ajustables
- Rotación de archivos
- Formato personalizable
- Almacenamiento en archivo y consola

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles.

## 👥 Desarrollo

Proyecto desarrollado por Gianpierre Mio.

### Desarrollador Principal

- **Gianpierre Mio**: Desarrollador de software, encargado de implementar esta solución.

Para contribuir al proyecto:

1. Revisa las guías de estilo de código
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Envía un Pull Request

## 📞 Contacto

Para soporte o consultas, contacta al desarrollador:

- Nombre: Gianpierre Mio
- Email: gianxs296@gmail.com
- Teléfono: +51952164832
