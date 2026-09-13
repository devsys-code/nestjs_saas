# 🦁 nestjs_saas - SaaS Core Template (Backend)

Plantilla oficial y arquitectura base para sistemas SaaS Multitenant construida con **NestJS 11+**, **Prisma 7**, **Fastify** y **PostgreSQL**.

Incluye:
- 🏢 **Arquitectura Multitenant:** `BaseTenantService` agnóstico a tipo de PK y `createTenantController` con 6 endpoints estándar.
- 🔐 **Autenticación JWT:** Módulo `uth/` con guards, roles y tenant context.
- 📦 **Prisma 7 Multi-modelo:** Esquemas organizados en carpetas de 3 letras.
- 🤖 **Skills de IA integradas:** Carpeta `.agents/skills/` con `nestjs-crud` para generar entidades de negocio.

## ⚡ Inicio Rápido
```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run start:dev
```
