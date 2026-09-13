import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsIn, IsDateString, IsString } from 'class-validator';
import {
  MultiIdFilter,
  BooleanFilter,
  DateRangeFilter,
} from './filter.decorators';

export class BaseFilterDto {
  [key: string]: unknown;

  @ApiProperty({ required: false, type: String, description: 'Page number' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({
    required: false,
    type: String,
    description: 'Page size (0 = all)',
  })
  @IsOptional()
  @IsString()
  size?: string;

  @MultiIdFilter()
  id?: string;

  @BooleanFilter({ description: 'Filter by active status (true/false)' })
  is_active?: boolean;

  @DateRangeFilter({ description: 'Filter by creation date (YYYY-MM-DD)' })
  created_at?: string;

  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    description: 'Created after (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  created_at_gte?: string;

  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    description: 'Created before (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  created_at_lte?: string;

  @DateRangeFilter({ description: 'Filter by update date (YYYY-MM-DD)' })
  updated_at?: string;

  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    description: 'Updated after (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  updated_at_gte?: string;

  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    description: 'Updated before (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  updated_at_lte?: string;

  @DateRangeFilter({ description: 'Filter by deletion date (YYYY-MM-DD)' })
  deleted_at?: string;

  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    description: 'Deleted after (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  deleted_at_gte?: string;

  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    description: 'Deleted before (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  deleted_at_lte?: string;

  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order_dir debe ser: asc o desc' })
  order_dir?: 'asc' | 'desc';
}
