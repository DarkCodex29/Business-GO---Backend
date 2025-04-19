import { applyDecorators } from '@nestjs/common';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsBoolean,
  IsDate,
  IsInt,
  IsPositive,
  IsEmail,
  IsPhoneNumber,
  IsUrl,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
  MinLength,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Decoradores comunes para campos de texto
export function RequiredString(maxLength = 255, description?: string) {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MaxLength(maxLength),
    ApiProperty({ description, required: true }),
  );
}

export function OptionalString(maxLength = 255, description?: string) {
  return applyDecorators(
    IsString(),
    IsOptional(),
    MaxLength(maxLength),
    ApiProperty({ description, required: false }),
  );
}

// Decoradores para números
export function RequiredNumber(min = 0, description?: string) {
  return applyDecorators(
    IsNumber(),
    IsNotEmpty(),
    Min(min),
    ApiProperty({ description, required: true }),
  );
}

export function OptionalNumber(min = 0, description?: string) {
  return applyDecorators(
    IsNumber(),
    IsOptional(),
    Min(min),
    ApiProperty({ description, required: false }),
  );
}

// Decoradores para enteros positivos
export function RequiredPositiveInteger() {
  return applyDecorators(IsInt(), IsPositive(), IsNotEmpty());
}

export function OptionalPositiveInteger() {
  return applyDecorators(IsInt(), IsPositive(), IsOptional());
}

// Decoradores para booleanos
export function RequiredBoolean(description?: string) {
  return applyDecorators(
    IsBoolean(),
    IsNotEmpty(),
    ApiProperty({ description, required: true }),
  );
}

export function OptionalBoolean(description?: string) {
  return applyDecorators(
    IsBoolean(),
    IsOptional(),
    ApiProperty({ description, required: false }),
  );
}

// Decoradores para fechas
export function RequiredDate(description?: string) {
  return applyDecorators(
    IsDate(),
    Transform(({ value }) => new Date(value)),
    IsNotEmpty(),
    ApiProperty({ description, required: true }),
  );
}

export function OptionalDate(description?: string) {
  return applyDecorators(
    IsDate(),
    Transform(({ value }) => new Date(value)),
    IsOptional(),
    ApiProperty({ description, required: false }),
  );
}

// Decoradores para emails
export function RequiredEmail() {
  return applyDecorators(IsEmail(), IsNotEmpty());
}

export function OptionalEmail() {
  return applyDecorators(IsEmail(), IsOptional());
}

// Decoradores para teléfonos
export function RequiredPhone() {
  return applyDecorators(IsPhoneNumber(), IsNotEmpty());
}

export function OptionalPhone() {
  return applyDecorators(IsPhoneNumber(), IsOptional());
}

// Decoradores para URLs
export function RequiredUrl() {
  return applyDecorators(IsUrl(), IsNotEmpty());
}

export function OptionalUrl() {
  return applyDecorators(IsUrl(), IsOptional());
}

// Decoradores para arrays
export function RequiredArray(type: any) {
  return applyDecorators(
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => type),
    IsNotEmpty(),
  );
}

export function OptionalArray(type: any) {
  return applyDecorators(
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => type),
    IsOptional(),
  );
}

// Decoradores para enums
export function RequiredEnum(enumType: any) {
  return applyDecorators(IsEnum(enumType), IsNotEmpty());
}

export function OptionalEnum(enumType: any) {
  return applyDecorators(IsEnum(enumType), IsOptional());
}

// Decoradores para documentos (DNI, RUC, etc.)
export function RequiredDocument(type: 'DNI' | 'RUC' = 'DNI') {
  const pattern = type === 'DNI' ? /^\d{8}$/ : /^\d{11}$/;
  return applyDecorators(
    IsString(),
    Matches(pattern, {
      message: `El ${type} debe tener ${type === 'DNI' ? '8' : '11'} dígitos`,
    }),
    IsNotEmpty(),
  );
}

export function OptionalDocument(type: 'DNI' | 'RUC' = 'DNI') {
  const pattern = type === 'DNI' ? /^\d{8}$/ : /^\d{11}$/;
  return applyDecorators(
    IsString(),
    Matches(pattern, {
      message: `El ${type} debe tener ${type === 'DNI' ? '8' : '11'} dígitos`,
    }),
    IsOptional(),
  );
}

// Validadores específicos
export function Email(required = true, description?: string) {
  return applyDecorators(
    IsEmail(),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({ description, required }),
  );
}

export function Phone(required = true, description?: string) {
  return applyDecorators(
    IsString(),
    Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Formato de teléfono inválido' }),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({ description, required }),
  );
}

export function Url(required = true, description?: string) {
  return applyDecorators(
    IsUrl(),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({ description, required }),
  );
}

// Validadores para arrays
export function ArrayOf(
  type: Function,
  minSize = 1,
  maxSize?: number,
  description?: string,
) {
  return applyDecorators(
    IsArray(),
    ArrayMinSize(minSize),
    ...(maxSize ? [ArrayMaxSize(maxSize)] : []),
    ApiProperty({
      description,
      type: [type],
      minItems: minSize,
      ...(maxSize && { maxItems: maxSize }),
    }),
  );
}

// Validadores para enums
export function Enum(enumType: any, required = true, description?: string) {
  return applyDecorators(
    IsEnum(enumType),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({
      description,
      required,
      enum: enumType,
      enumName: enumType.name,
    }),
  );
}

// Validadores para documentos
export function DNI(required = true, description?: string) {
  return applyDecorators(
    IsString(),
    Matches(/^\d{8}$/, { message: 'DNI debe tener 8 dígitos' }),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({ description, required }),
  );
}

export function RUC(required = true, description?: string) {
  return applyDecorators(
    IsString(),
    Matches(/^\d{11}$/, { message: 'RUC debe tener 11 dígitos' }),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({ description, required }),
  );
}

// Validadores numéricos con rangos
export function NumberRange(
  min: number,
  max: number,
  required = true,
  description?: string,
) {
  return applyDecorators(
    IsNumber(),
    Min(min),
    Max(max),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({
      description,
      required,
      minimum: min,
      maximum: max,
    }),
  );
}

// Validadores de longitud de string
export function StringLength(
  min: number,
  max: number,
  required = true,
  description?: string,
) {
  return applyDecorators(
    IsString(),
    MinLength(min),
    MaxLength(max),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({
      description,
      required,
      minLength: min,
      maxLength: max,
    }),
  );
}

// Validador para enteros
export function Integer(required = true, description?: string) {
  return applyDecorators(
    IsInt(),
    required ? IsNotEmpty() : IsOptional(),
    ApiProperty({ description, required }),
  );
}
