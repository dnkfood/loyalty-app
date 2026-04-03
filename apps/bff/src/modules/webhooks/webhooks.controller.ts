import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { verifyHmacSignature } from '@loyalty/shared-utils';
import type { LoyaltyWebhookPayload } from '@loyalty/shared-types';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {}

  @Post('loyalty')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive loyalty system webhook events' })
  async receiveLoyaltyWebhook(
    @Body() payload: LoyaltyWebhookPayload,
    @Headers('x-loyalty-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ received: boolean }> {
    // HMAC verification using raw body
    const webhookSecret = this.configService.get<string>('app.loyaltySystem.webhookSecret', '');
    const rawBody = req.rawBody;

    if (!rawBody) {
      this.logger.warn('Webhook received without raw body', { ip: req.ip });
      throw new UnauthorizedException('Raw body not available');
    }

    if (!signature) {
      this.logger.warn('Webhook received without signature', { ip: req.ip });
      throw new UnauthorizedException('Missing X-Loyalty-Signature header');
    }

    const isValid = verifyHmacSignature(webhookSecret, rawBody, signature);

    if (!isValid) {
      this.logger.warn('Invalid webhook signature', {
        ip: req.ip,
        signature: signature.slice(0, 20) + '...',
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }

    await this.webhooksService.processEvent(payload);
    return { received: true };
  }
}
