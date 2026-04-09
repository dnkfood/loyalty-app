import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtStaffAuthGuard } from '../auth/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffRole } from '@loyalty/shared-types';

/**
 * Operational endpoints for admins. Endpoints here are typically temporary
 * or diagnostic — not part of the public API surface.
 */
@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminOpsController {
  private readonly logger = new Logger(AdminOpsController.name);

  /**
   * TEMPORARY: returns the BFF's public egress IP via api.ipify.org.
   * Used to whitelist the Render server IP with the AlfaSMS provider.
   * Remove once whitelisting is in place and stable.
   */
  @Get('server-ip')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Returns the BFF public IP (temporary, for SMS provider whitelisting)',
  })
  async getServerIp(): Promise<{ ip: string | null; error?: string }> {
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return { ip: null, error: `ipify HTTP ${response.status}` };
      }
      const data = (await response.json()) as { ip?: string };
      if (!data.ip) {
        return { ip: null, error: 'ipify response missing ip field' };
      }
      this.logger.log(`Reported server IP: ${data.ip}`);
      return { ip: data.ip };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Failed to fetch server IP: ${message}`);
      return { ip: null, error: message };
    }
  }
}
