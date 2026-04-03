import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ErrorCodes } from '@loyalty/shared-types';

const PHONE_REGEX = /^7\d{10}$/;

@Injectable()
export class PhoneValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const cleaned = value.replace(/[\s\-\(\)]/g, '');

    if (!PHONE_REGEX.test(cleaned)) {
      throw new BadRequestException({
        code: ErrorCodes.PHONE_INVALID,
        message: 'Invalid phone number format. Expected: 7XXXXXXXXXX (11 digits starting with 7)',
      });
    }

    return cleaned;
  }
}
