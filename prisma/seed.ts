import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Crear roles si no existen
  const adminRole = await prisma.rol.upsert({
    where: { nombre: 'ADMIN' },
    update: {},
    create: { nombre: 'ADMIN' },
  });

  const empresaRole = await prisma.rol.upsert({
    where: { nombre: 'EMPRESA' },
    update: {},
    create: { nombre: 'EMPRESA' },
  });

  const clienteRole = await prisma.rol.upsert({
    where: { nombre: 'CLIENTE' },
    update: {},
    create: { nombre: 'CLIENTE' },
  });

  // Hash de las contraseñas
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const empresaPassword = await bcrypt.hash('Empresa123!', 10);
  const clientePassword = await bcrypt.hash('Cliente123!', 10);

  // Crear usuarios si no existen
  const adminUser = await prisma.usuario.upsert({
    where: { email: 'gian.admin@businessgo.com' },
    update: {
      contrasena: adminPassword,
    },
    create: {
      nombre: 'Gian Admin',
      email: 'gian.admin@businessgo.com',
      contrasena: adminPassword,
      telefono: '+51952164832',
      rol_id: adminRole.id_rol,
    },
  });

  const empresaUser = await prisma.usuario.upsert({
    where: { email: 'gian.empresa@businessgo.com' },
    update: {
      contrasena: empresaPassword,
    },
    create: {
      nombre: 'Gian Empresa',
      email: 'gian.empresa@businessgo.com',
      contrasena: empresaPassword,
      telefono: '+51952164832',
      rol_id: empresaRole.id_rol,
    },
  });

  const clienteUser = await prisma.usuario.upsert({
    where: { email: 'gian.cliente@businessgo.com' },
    update: {
      contrasena: clientePassword,
    },
    create: {
      nombre: 'Gian Cliente',
      email: 'gian.cliente@businessgo.com',
      contrasena: clientePassword,
      telefono: '+51952164832',
      rol_id: clienteRole.id_rol,
    },
  });

  console.log({ adminUser, empresaUser, clienteUser });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
