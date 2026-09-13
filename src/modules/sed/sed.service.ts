import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus } from '../../../generated/prisma/enums';
import * as bcryptjs from 'bcryptjs';

const ORGS = [
  { name: 'TechCorp', slug: 'techcorp' },
  { name: 'InnovateLab', slug: 'innovatelab' },
  { name: 'DataSoft', slug: 'datasoft' },
  { name: 'CloudNine', slug: 'cloudnine' },
  { name: 'DigitalHub', slug: 'digitalhub' },
];

const USERS_PER_ORG = [
  { emailPrefix: 'admin', role: 'admin' },
  { emailPrefix: 'user1', role: 'member' },
  { emailPrefix: 'user2', role: 'member' },
  { emailPrefix: 'user3', role: 'viewer' },
  { emailPrefix: 'user4', role: 'member' },
];

const ACTIONS = [
  'Revisar y corregir',
  'Implementar módulo de',
  'Optimizar rendimiento en',
  'Diseñar interfaz para',
  'Configurar pipeline de',
  'Escribir pruebas unitarias de',
  'Auditar seguridad y roles en',
  'Migrar base de datos de',
  'Documentar endpoints de',
  'Refactorizar lógica de negocio en',
  'Actualizar dependencias de',
  'Monitorear alertas en',
  'Automatizar despliegue de',
  'Integrar pasarela de',
];

const TOPICS = [
  'autenticación JWT y roles de usuario',
  'pasarela de pagos con Stripe y Webhooks',
  'catálogo de productos e inventario',
  'notificaciones push y correos transaccionales',
  'gestión de pedidos y facturación electrónica',
  'caché distribuida con Redis y NestJS',
  'microservicio de envíos y geolocalización',
  'auditoría de eventos y logs estructurados',
  'dashboard de métricas en tiempo real',
  'exportación masiva de reportes en Excel y PDF',
  'control de acceso basado en políticas (PBAC)',
  'gestión de sesiones concurrentes y token blacklist',
  'subida y procesamiento de archivos multimedia',
  'sincronización de datos offline con clientes móviles',
];

const MODULES = [
  'Auth',
  'Facturación',
  'Core API',
  'Seguridad',
  'Infraestructura',
  'Analytics',
  'Frontend UI',
  'Integraciones',
  'Reportes',
  'DevOps',
];

const TICKET_PREFIXES = [
  'TECH',
  'FE',
  'BE',
  'CORE',
  'SEC',
  'DEVOPS',
  'DATA',
  'SRV',
];

const TITLE_TEMPLATES = [
  (action: string, topic: string) => `${action} ${topic}`,
  (action: string, topic: string, prefix: string, num: number) =>
    `[${prefix}-${num}] ${action} ${topic}`,
  (action: string, topic: string, _prefix: string, _num: number, mod: string) =>
    `${mod}: ${action} ${topic}`,
  (action: string, topic: string) => `Feat: ${action.toLowerCase()} ${topic}`,
  (action: string, topic: string) =>
    `Fix: Error reportado al ${action.toLowerCase()} ${topic}`,
  (action: string, topic: string) => `Refactor: ${action} ${topic} para v2.0`,
  (action: string, topic: string) => `[Urgente] ${action} ${topic}`,
  (action: string, topic: string) => `Integración: ${action} ${topic}`,
  (action: string, topic: string, prefix: string, num: number) =>
    `Ticket #${prefix}${num} - ${action} ${topic}`,
  (action: string, topic: string) => `Auditoría: ${action} ${topic}`,
];

const DESCRIPTION_TEMPLATES = [
  (action: string, topic: string, orgName: string) =>
    `Se requiere ${action.toLowerCase()} ${topic} en el entorno de ${orgName} para asegurar el cumplimiento de los estándares de calidad.`,
  (action: string, topic: string) =>
    `Prioridad alta para el sprint en curso. Es necesario ${action.toLowerCase()} ${topic} antes del siguiente release a producción.`,
  (action: string, topic: string) =>
    `Detalle técnico:\n- Objetivo principal: ${action} ${topic}.\n- Incluye validación de esquemas y pruebas de estrés.`,
  (action: string, topic: string, orgName: string) =>
    `El equipo de ${orgName} reportó inconsistencias. Proceder con: ${action.toLowerCase()} ${topic}.`,
  (action: string, topic: string) =>
    `Pasos a seguir:\n1. Analizar requerimientos de arquitectura.\n2. ${action} ${topic}.\n3. Desplegar en staging para pruebas de integración.`,
  (action: string, topic: string) =>
    `Optimización solicitada tras revisión de logs. Alcance: ${action.toLowerCase()} ${topic}.`,
  (_action: string, topic: string) =>
    `${topic.charAt(0).toUpperCase() + topic.slice(1)} pendiente de validación y pase a producción.`,
  (action: string, topic: string) =>
    `Revisar documentación técnica y coordinar con el equipo para ${action.toLowerCase()} ${topic}.`,
  () => null, // Tareas sin descripción (casos reales)
];

const STATUSES: TaskStatus[] = [
  TaskStatus.yellow,
  TaskStatus.green,
  TaskStatus.red,
];

@Injectable()
export class SedService {
  constructor(private readonly prisma: PrismaService) {}

  seed = async () => {
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Task" RESTART IDENTITY CASCADE;',
    );
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "RefreshToken" RESTART IDENTITY CASCADE;',
    );
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "TokenBlacklist" RESTART IDENTITY CASCADE;',
    );
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;',
    );
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Organizacion" RESTART IDENTITY CASCADE;',
    );

    const hashedPassword = await bcryptjs.hash('123456', 10);
    let totalOrgs = 0;
    let totalUsers = 0;
    let totalTasks = 0;

    for (let orgIdx = 0; orgIdx < ORGS.length; orgIdx++) {
      const orgData = ORGS[orgIdx];
      const org = await this.prisma.organizacion.create({
        data: { name: orgData.name, slug: orgData.slug },
      });
      totalOrgs++;

      for (const userData of USERS_PER_ORG) {
        await this.prisma.user.create({
          data: {
            organizacion_id: org.id,
            email: `${userData.emailPrefix}@${orgData.slug}.com`,
            name: `${userData.emailPrefix.charAt(0).toUpperCase() + userData.emailPrefix.slice(1)} ${orgData.name}`,
            password: hashedPassword,
            role: userData.role,
          },
        });
        totalUsers++;
      }

      const tasks: Array<{
        title: string;
        description: string | null;
        status: TaskStatus;
        is_active: boolean;
        deleted_at: Date | null;
        organizacion_id: string;
        created_at: Date;
        updated_at: Date;
      }> = [];
      const now = Date.now();

      for (let i = 1; i <= 100; i++) {
        const seedIndex = orgIdx * 100 + i;

        // Selección pseudoaleatoria variada
        const action = ACTIONS[(seedIndex * 7) % ACTIONS.length];
        const topic = TOPICS[(seedIndex * 11) % TOPICS.length];
        const moduleName = MODULES[(seedIndex * 3) % MODULES.length];
        const ticketPrefix =
          TICKET_PREFIXES[(seedIndex * 5) % TICKET_PREFIXES.length];
        const ticketNum = 100 + ((seedIndex * 13) % 900);

        const titleTemplate =
          TITLE_TEMPLATES[seedIndex % TITLE_TEMPLATES.length];
        const descTemplate =
          DESCRIPTION_TEMPLATES[seedIndex % DESCRIPTION_TEMPLATES.length];

        const title = titleTemplate(
          action,
          topic,
          ticketPrefix,
          ticketNum,
          moduleName,
        );
        const description = descTemplate(action, topic, orgData.name);

        const status = STATUSES[(seedIndex * 3) % STATUSES.length];
        const daysAgo = (seedIndex * 17) % 45;
        const createdAt = new Date(
          now -
            daysAgo * 24 * 60 * 60 * 1000 -
            ((seedIndex * 73) % 86400) * 1000,
        );

        // 25% de las tareas son soft-deleted (eliminadas)
        const isDeleted = i % 4 === 0;
        const deletedAt = isDeleted
          ? new Date(
              createdAt.getTime() +
                (((seedIndex * 19) % 72) + 2) * 60 * 60 * 1000,
            )
          : null;

        tasks.push({
          title,
          description,
          status,
          is_active: !isDeleted,
          deleted_at: deletedAt,
          organizacion_id: org.id,
          created_at: createdAt,
          updated_at: isDeleted ? (deletedAt ?? createdAt) : createdAt,
        });
      }

      const result = await this.prisma.task.createMany({ data: tasks });
      totalTasks += result.count;
    }

    return {
      message: 'Seed completado exitosamente',
      organizaciones: totalOrgs,
      usuarios: totalUsers,
      tareas: totalTasks,
      credentials: {
        note: 'Todas las contraseñas son: 123456',
        users: ORGS.flatMap((org) =>
          USERS_PER_ORG.map((u) => ({
            email: `${u.emailPrefix}@${org.slug}.com`,
            password: '123456',
            role: u.role,
            organizacion: org.name,
          })),
        ),
      },
    };
  };

  reset = async () => {
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Task" RESTART IDENTITY CASCADE;',
    );
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "RefreshToken" RESTART IDENTITY CASCADE;',
    );
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "TokenBlacklist" RESTART IDENTITY CASCADE;',
    );
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;',
    );
    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Organizacion" RESTART IDENTITY CASCADE;',
    );
    return {
      message:
        'Tablas vaciadas y reiniciadas correctamente (Task, User, Organizacion, RefreshToken, TokenBlacklist)',
      totalRemaining: 0,
    };
  };
}
