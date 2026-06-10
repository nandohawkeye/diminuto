import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { ShortcodeService } from '../shared/shortcode/shortcode.service';
import { RedisService } from '../shared/redis/redis.service';
import { CreateLinkDto } from './dto/create-link.dto';

const CACHE_TTL = 3600; // 1 hora

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shortcode: ShortcodeService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateLinkDto, userId: string) {
    const code = await this.shortcode.generate();

    const link = await this.prisma.link.create({
      data: {
        code,
        url: dto.url,
        userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    // Pre-popula o cache pra evitar uma query no primeiro redirect
    await this.redis.set(`link:${code}`, dto.url, CACHE_TTL);

    return link;
  }

  async findAllByUser(userId: string) {
    return this.prisma.link.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { clicks: true } } },
    });
  }

  async delete(code: string, userId: string) {
    const link = await this.prisma.link.findUnique({ where: { code } });

    if (!link) throw new NotFoundException('Link not found');
    if (link.userId !== userId) throw new ForbiddenException();

    await this.prisma.link.delete({ where: { code } });
    await this.redis.del(`link:${code}`);
  }
}
