import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../shared/prisma/prisma.service';
import type { ClickPayload } from '../redirect/redirect.service';

@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger(AnalyticsListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('click.created', { async: true })
  async handleClick(payload: ClickPayload) {
    try {
      // O linkId pode ser o code (cache hit) ou o id real (db hit)
      const link = await this.prisma.link.findFirst({
        where: {
          OR: [{ id: payload.linkId }, { code: payload.linkId }],
        },
      });

      if (!link) return;

      await this.prisma.click.create({
        data: {
          linkId: link.id,
          ip: payload.ip,
          referrer: payload.referrer,
          userAgent: payload.userAgent,
        },
      });
    } catch (err) {
      this.logger.error('Failed to record click', err);
    }
  }
}
