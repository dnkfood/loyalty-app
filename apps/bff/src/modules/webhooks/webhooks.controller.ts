import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { WebhooksService } from './webhooks.service';

function maskCell(cell: string): string {
  if (cell.length < 6) return cell;
  return `${cell.slice(0, 3)}***${cell.slice(-3)}`;
}

function safeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {}

  @Get('loyalty')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Loyalty system webhook (GET): notifies BFF that a guest balance has changed; we drop Redis cache for this cell.',
  })
  @ApiQuery({ name: 'atoken', required: true, description: 'Static auth token' })
  @ApiQuery({ name: 'cell', required: true, description: 'Guest phone (10 digits)' })
  async receiveLoyaltyWebhook(
    @Query('atoken') atoken: string,
    @Query('cell') cell: string,
  ): Promise<{ received: boolean }> {
    const expected = this.configService.get<string>('app.loyaltySystem.webhookSecret', '');

    if (!expected) {
      this.logger.error('LOYALTY_WEBHOOK_SECRET is not configured — rejecting webhook');
      throw new UnauthorizedException('Webhook secret not configured');
    }

    if (!atoken || !safeEqualString(atoken, expected)) {
      this.logger.warn('Webhook rejected: invalid or missing atoken');
      throw new UnauthorizedException('Invalid atoken');
    }

    const digits = (cell ?? '').replace(/\D/g, '');
    if (digits.length !== 10) {
      this.logger.warn(`Webhook rejected: invalid cell format (len=${digits.length})`);
      throw new BadRequestException('cell must be 10 digits');
    }

    this.logger.log(`Webhook received for cell=${maskCell(digits)}`);

    await this.webhooksService.handleBalanceChanged(digits);
    return { received: true };
  }
}
