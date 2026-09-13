import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserInOrgDto {
  @ApiProperty({ example: 'admin@techcorp.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Juan Admin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class CreateOrgDto {
  @ApiProperty({
    example: 'TechCorp',
    description: 'Nombre de la organización',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: 'techcorp',
    description: 'Slug único de la organización',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug!: string;

  @ApiProperty({
    type: CreateUserInOrgDto,
    description: 'Primer usuario administrador',
  })
  @ValidateNested()
  @Type(() => CreateUserInOrgDto)
  user!: CreateUserInOrgDto;
}

export class UpdateOrgDto {
  @ApiPropertyOptional({ example: 'TechCorp Updated' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'techcorp-updated' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  is_active?: boolean;
}
