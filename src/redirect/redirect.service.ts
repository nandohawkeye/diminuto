import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../shared/prisma/prisma.service';
import { RedisService } from '../shared/redis/redis.service';

export interface ClickPayload {
  linkId: string;
  ip?: string;
  referrer?: string;
  userAgent?: string;
}

const CACHE_TTL = 3600;

@Injectable()
export class RedirectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emitter: EventEmitter2,
  ) {}

  async resolve(
    code: string,
    meta: Omit<ClickPayload, 'linkId'>,
  ): Promise<string> {
    // 1. Tenta o cache primeiro
    const cached = await this.redis.get(`link:${code}`);
    if (cached) {
      this.emitter.emit('click.created', { linkId: code, ...meta });
      return cached;
    }

    // 2. Cache miss — busca no banco
    const link = await this.prisma.link.findUnique({ where: { code } });
    if (!link) throw new NotFoundException('Short link not found');

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new GoneException('This link has expired');
    }

    // 3. Popula o cache pra próxima vez
    await this.redis.set(`link:${code}`, link.url, CACHE_TTL);

    this.emitter.emit('click.created', { linkId: link.id, ...meta });
    return link.url;
  }
}
