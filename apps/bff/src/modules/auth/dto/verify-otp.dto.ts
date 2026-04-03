import { IsString, Matches, Length, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '79123456789',
  })
  @IsString()
  @Matches(/^7\d{10}$/, {
    message: 'Phone must be in format 7XXXXXXXXXX (11 digits starting with 7)',
  })
  phone!: string;

  @ApiProperty({
    description: 'OTP code (6 digits)',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP code must contain only digits' })
  code!: string;

  @ApiPropertyOptional({
    description: 'Unique device identifier',
    example: 'device-uuid-here',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
