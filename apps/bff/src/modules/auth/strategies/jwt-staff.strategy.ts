import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtStaffPayload {
  sub: string;
  email: string;
  role: string;
  type: 'staff';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStaffStrategy extends PassportStrategy(Strategy, 'jwt-staff') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') ?? 'change-me',
    });
  }

  validate(payload: JwtStaffPayload): JwtStaffPayload {
    if (payload.type !== 'staff') {
      throw new UnauthorizedException('Invalid token type');
    }
    return payload;
  }
}
