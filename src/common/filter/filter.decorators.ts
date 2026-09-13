import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  FILTER_KEY,
  type FilterMetadata,
  type TextMode,
} from './filter-where.util';

const setFilterMeta = (metadata: FilterMetadata): PropertyDecorator => {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(FILTER_KEY, metadata, target, propertyKey);
  };
};

export const TextFilter = (options?: {
  field?: string;
  mode?: TextMode;
  description?: string;
}): PropertyDecorator => {
  return applyDecorators(
    ApiProperty({
      required: false,
      type: String,
      description: options?.description,
    }),
    IsOptional(),
    IsString(),

    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    setFilterMeta({
      type: 'text',
      field: options?.field,
      textMode: options?.mode ?? 'contains',
    }),
  );
};

export const BooleanFilter = (options?: {
  field?: string;
  description?: string;
}): PropertyDecorator => {
  return applyDecorators(
    ApiProperty({
      required: false,
      type: Boolean,
      description: options?.description,
    }),
    IsOptional(),
    Type(() => String),

    Transform(({ value }: { value: unknown }) =>
      value === 'true' || value === true
        ? true
        : value === 'false' || value === false
          ? false
          : value,
    ),
    setFilterMeta({ type: 'boolean', field: options?.field }),
  );
};

export const EnumFilter = (
  enumObj: object,
  options?: { field?: string; message?: string; description?: string },
): PropertyDecorator => {
  return applyDecorators(
    ApiProperty({
      required: false,
      enum: enumObj,
      description: options?.description,
    }),
    IsOptional(),
    IsEnum(enumObj, { message: options?.message }),
    setFilterMeta({ type: 'enum', field: options?.field }),
  );
};

export const DateFilter = (options?: {
  field?: string;
  description?: string;
}): PropertyDecorator => {
  return applyDecorators(
    ApiProperty({
      required: false,
      type: String,
      format: 'date-time',
      description: options?.description,
    }),
    IsOptional(),
    IsDateString(),
    setFilterMeta({ type: 'date', field: options?.field }),
  );
};

export const DateRangeFilter = (options?: {
  field?: string;
  description?: string;
}): PropertyDecorator => {
  return applyDecorators(
    ApiProperty({
      required: false,
      type: String,
      format: 'date-time',
      description: options?.description ?? 'Date range (YYYY-MM-DD)',
    }),
    IsOptional(),
    IsDateString(),
    setFilterMeta({ type: 'dateRange', field: options?.field }),
  );
};

export const MultiIdFilter = (options?: {
  description?: string;
}): PropertyDecorator => {
  return applyDecorators(
    ApiProperty({
      required: false,
      type: String,
      description: options?.description ?? 'Comma-separated IDs',
    }),
    IsOptional(),
    IsString(),
    setFilterMeta({ type: 'multiId' }),
  );
};

export const SearchFilter = (
  fields: string[],
  options?: { description?: string },
): PropertyDecorator => {
  return applyDecorators(
    ApiProperty({
      required: false,
      type: String,
      description: options?.description ?? `Search in: ${fields.join(', ')}`,
    }),
    IsOptional(),
    IsString(),
    setFilterMeta({ type: 'search', fields }),
  );
};

export const OrderByFilter = (
  allowedFields: readonly string[],
  defaultField: string = 'created_at',
  options?: { description?: string },
): PropertyDecorator => {
  return applyDecorators(
    ApiProperty({
      required: false,
      type: String,
      enum: [...allowedFields],
      description:
        options?.description ??
        `Sort field. Allowed: ${allowedFields.join(', ')}. Default: ${defaultField}`,
    }),
    IsOptional(),
    IsIn([...allowedFields], {
      message: `order_by debe ser: ${allowedFields.join(', ')}`,
    }),
    setFilterMeta({
      type: 'orderBy',
      allowedOrderFields: allowedFields,
      defaultOrderField: defaultField,
    }),
  );
};
