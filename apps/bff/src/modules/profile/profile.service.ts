import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsOptional, IsString, IsEmail, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Иван Иванов' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}

export class ConsentDto {
  @IsString()
  consentVersion!: string;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets the user profile.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        birthDate: true,
        avatarUrl: true,
        consentGiven: true,
        consentGivenAt: true,
        consentVersion: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Updates the user profile.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        birthDate: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Profile updated for user ${userId}`);
    return user;
  }

  /**
   * Records user consent for personal data processing.
   */
  async recordConsent(userId: string, consentVersion: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        consentGiven: true,
        consentGivenAt: new Date(),
        consentVersion,
      },
    });

    this.logger.log(`Consent recorded for user ${userId}, version ${consentVersion}`);
    return { success: true };
  }
}
