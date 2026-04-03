import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '79123456789',
  })
  @IsString()
  @Matches(/^7\d{10}$/, {
    message: 'Phone must be in format 7XXXXXXXXXX (11 digits starting with 7)',
  })
  phone!: string;
}
