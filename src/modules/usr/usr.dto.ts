import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEmail,
  MinLength,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@techcorp.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({
    example: 'member',
    enum: ['admin', 'member', 'viewer'],
  })
  @IsOptional()
  @IsIn(['admin', 'member', 'viewer'])
  role?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan Pérez Updated' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'newemail@techcorp.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    example: 'admin',
    enum: ['admin', 'member', 'viewer'],
  })
  @IsOptional()
  @IsIn(['admin', 'member', 'viewer'])
  role?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  is_active?: boolean;
}
