import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  expiresAt?: string;
  discount?: number;
  conditions?: string;
}

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Gets personalized offers for a user from the loyalty system.
   */
  async getOffers(userId: string, externalGuestId: string): Promise<Offer[]> {
    this.logger.debug(`Fetching offers for user ${userId}`);

    // TODO: Fetch from loyalty system API
    const loyaltyApiUrl = this.configService.get<string>('app.loyaltySystem.apiUrl');
    const loyaltyApiKey = this.configService.get<string>('app.loyaltySystem.apiKey');

    try {
      const response = await fetch(`${loyaltyApiUrl}/guests/${externalGuestId}/offers`, {
        headers: { Authorization: `Bearer ${loyaltyApiKey}` },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch offers for guest ${externalGuestId}: ${response.status}`);
        return [];
      }

      return response.json() as Promise<Offer[]>;
    } catch (err) {
      this.logger.warn(`Offers service unavailable: ${(err as Error).message}`);
      return [];
    }
  }
}
