import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from './strategies/jwt.strategy';
import type { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';
import type { Request } from 'express';

function parseDeviceInfo(raw: string | undefined): unknown | undefined {
  if (!raw || raw.length > 4096) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiBody({ type: SendOtpDto })
  async sendOtp(@Body() dto: SendOtpDto, @Req() req: Request): Promise<{ message: string }> {
    return this.authService.sendOtp(dto, req.ip);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and receive JWT tokens' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Headers('x-device-id') xDeviceId?: string,
    @Headers('x-device-info') xDeviceInfo?: string,
  ) {
    return this.authService.verifyOtp(
      dto,
      req.ip,
      xDeviceId,
      parseDeviceInfo(xDeviceInfo),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(
    @CurrentUser() user: JwtRefreshPayload & { refreshToken: string },
    @Req() req: Request,
    @Headers('x-device-id') xDeviceId?: string,
    @Headers('x-device-info') xDeviceInfo?: string,
  ) {
    return this.authService.refresh(
      user.sub,
      user.sessionId,
      user.refreshToken,
      req.ip,
      xDeviceId,
      parseDeviceInfo(xDeviceInfo),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.authService.logout(user.sub, '');
  }
}
