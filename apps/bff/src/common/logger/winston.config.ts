import { WinstonModule, utilities as nestWinstonUtils } from 'nest-winston';
import * as winston from 'winston';
import { maskPhone } from '@loyalty/shared-utils';

// Custom format that masks phone numbers in log messages
const maskPiiFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    // Mask any 11-digit phone numbers (7XXXXXXXXXX pattern)
    info.message = info.message.replace(/\b7\d{10}\b/g, (match: string) => maskPhone(match));
  }
  // Also mask in metadata
  if (info.phone && typeof info.phone === 'string') {
    info.phone = maskPhone(info.phone);
  }
  return info;
})();

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        maskPiiFormat,
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              nestWinstonUtils.format.nestLike('Loyalty-BFF', { prettyPrint: true }),
            ),
      ),
    }),
  ],
};
