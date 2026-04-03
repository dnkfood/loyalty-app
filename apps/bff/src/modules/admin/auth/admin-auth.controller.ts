import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

class StaffLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

@ApiTags('admin')
@Controller('admin/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Staff login' })
  async login(@Body() dto: StaffLoginDto) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { email: dto.email },
    });

    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Wrong email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Wrong email or password');
    }

    // Update last login
    await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: staff.id, email: staff.email, role: staff.role, type: 'staff' };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Staff login: ${staff.email} (${staff.role})`);

    return {
      accessToken,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
      },
    };
  }
}
