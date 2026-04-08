import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

class RegisterPushTokenDto {
  @IsString()
  token!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';
}

class RemovePushTokenDto {
  @IsString()
  token!: string;
}

@ApiTags('devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('push-token')
  @ApiOperation({ summary: 'Register or update a push token' })
  async registerPushToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.devicesService.registerPushToken(user.sub, dto.token, dto.platform);
  }

  @Delete('push-token')
  @ApiOperation({ summary: 'Remove a push token' })
  async removePushToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RemovePushTokenDto,
  ) {
    return this.devicesService.removePushToken(user.sub, dto.token);
  }
}
