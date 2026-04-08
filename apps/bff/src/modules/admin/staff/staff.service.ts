import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { IsString, IsEmail, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@loyalty/shared-types';

const BCRYPT_COST = 10;

export class CreateStaffDto {
  @ApiProperty({ example: 'admin@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: StaffRole })
  @IsEnum(StaffRole)
  role!: StaffRole;

  @ApiProperty({ example: 'strong-password-here' })
  @IsString()
  password!: string;
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ enum: StaffRole })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists staff users with pagination.
   */
  async listStaff(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.staffUser.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.staffUser.count(),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Creates a new staff user.
   */
  async createStaff(dto: CreateStaffDto) {
    const existing = await this.prisma.staffUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Staff user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const staff = await this.prisma.staffUser.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    this.logger.log(`Staff user created: ${staff.id} (${staff.email})`);
    return staff;
  }

  /**
   * Updates a staff user's role or active status.
   */
  async updateStaff(staffId: string, dto: UpdateStaffDto) {
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Staff user not found');
    }

    const updated = await this.prisma.staffUser.update({
      where: { id: staffId },
      data: {
        role: dto.role,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Staff user updated: ${staffId}`);
    return updated;
  }
}
