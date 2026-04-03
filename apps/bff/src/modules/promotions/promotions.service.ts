import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Promotion {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  deepLink?: string;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Gets general promotions available to all users.
   */
  async getPromotions(): Promise<Promotion[]> {
    this.logger.debug('Fetching promotions');

    const loyaltyApiUrl = this.configService.get<string>('app.loyaltySystem.apiUrl');
    const loyaltyApiKey = this.configService.get<string>('app.loyaltySystem.apiKey');

    try {
      const response = await fetch(`${loyaltyApiUrl}/promotions`, {
        headers: { Authorization: `Bearer ${loyaltyApiKey}` },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch promotions: ${response.status}`);
        return [];
      }

      return response.json() as Promise<Promotion[]>;
    } catch (err) {
      this.logger.warn(`Promotions service unavailable: ${(err as Error).message}`);
      return [];
    }
  }
}
