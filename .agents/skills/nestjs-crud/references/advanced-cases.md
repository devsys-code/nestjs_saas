# Casos Avanzados en NestJS CRUD

## Caso 1: Registro Doble / Transaccional (Persona + Usuario)

Cuando registrar una entidad requiere crear simultáneamente un registro secundario en otra tabla:

```typescript
@Injectable()
export class PerService extends BaseTenantService<PersonaModel, CreatePersonaDto, UpdatePersonaDto> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: UthService,
    tenant: TenantService,
  ) {
    super(prisma.persona, tenant, {
      entityName: 'Persona',
      gender: 'f',
      buildWhere: buildPersonaWhere,
      buildOrderBy: buildPersonaOrderBy,
    });
  }

  override create = async (dto: CreatePersonaDto) => {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear el usuario asociado
      const hashedPassword = await this.authService.hashPassword(dto.user.password);
      const user = await tx.user.create({
        data: {
          organizacion_id: this.tenantId,
          email: dto.user.email,
          name: `${dto.first_name} ${dto.last_name}`,
          password: hashedPassword,
          role: dto.user.role ?? 'member',
        },
      });

      // 2. Crear la persona asociada vinculando user_id
      return tx.persona.create({
        data: {
          organizacion_id: this.tenantId,
          user_id: user.id,
          first_name: dto.first_name,
          last_name: dto.last_name,
          dni: dto.dni,
          phone: dto.phone,
        },
        include: { user: true },
      });
    });
  };
}
```

## Caso 2: Claves Primarias Autoincrementables

Si el modelo usa `@id @default(autoincrement()) Int`:
1. El parámetro de ruta en el controlador debe parsearse con `ParseIntPipe`:
   ```typescript
   @Get('detail/:id')
   async detail(@Param('id', ParseIntPipe) id: number) {
     return this.service.detail(id);
   }
   ```
2. En el servicio, el método `detail`, `update`, `delete` espera `id: number` en lugar de `id: string`.

## Caso 3: Registro Masivo (Bulk Import)

```typescript
// En controller:
@Post('bulk')
@ApiOperation({ summary: 'Registro masivo' })
async createBulk(@Body() dto: BulkCreatePaqueteDto) {
  return this.paqService.createBulk(dto.items);
}

// En service:
async createBulk(items: CreatePaqueteDto[]) {
  const data = items.map((item) => ({
    ...item,
    organizacion_id: this.tenantId,
  }));
  return this.prisma.paquete.createMany({
    data,
    skipDuplicates: true,
  });
}
```
