import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const credential = this.loadCredential();
    if (!credential) {
      this.logger.warn('Firebase service account not configured; FCM sending disabled');
      return;
    }

    try {
      this.app =
        admin.apps.length > 0
          ? admin.app()
          : admin.initializeApp({ credential: admin.credential.cert(credential) });
      this.logger.log(`Firebase Admin initialized for project ${credential.projectId}`);
    } catch (err) {
      this.logger.error(`Firebase Admin init failed: ${(err as Error).message}`);
    }
  }

  getMessaging(): admin.messaging.Messaging | null {
    return this.app ? this.app.messaging() : null;
  }

  private loadCredential(): admin.ServiceAccount | null {
    const inline = this.configService.get<string>('app.push.firebase.serviceAccountJson', '');
    if (inline) {
      try {
        return JSON.parse(inline) as admin.ServiceAccount;
      } catch (err) {
        this.logger.error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${(err as Error).message}`);
        return null;
      }
    }

    const path = this.configService.get<string>('app.push.firebase.serviceAccountPath', '');
    if (path) {
      try {
        const abs = resolve(path);
        const raw = readFileSync(abs, 'utf8');
        return JSON.parse(raw) as admin.ServiceAccount;
      } catch (err) {
        this.logger.error(`Cannot read service account from ${path}: ${(err as Error).message}`);
        return null;
      }
    }

    return null;
  }
}
