import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface JwtRefreshPayload {
  sub: string;   // userId
  sessionId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret') ?? 'change-me-refresh',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtRefreshPayload): JwtRefreshPayload & { refreshToken: string } {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }
    const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }
    return { ...payload, refreshToken };
  }
}
