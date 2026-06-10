import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(code: string, userId: string) {
    const link = await this.prisma.link.findUnique({
      where: { code },
      include: { _count: { select: { clicks: true } } },
    });

    if (!link) throw new NotFoundException('Link not found');
    if (link.userId !== userId) throw new ForbiddenException();

    const clicks = await this.prisma.click.findMany({
      where: { linkId: link.id },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupa cliques por dia
    const byDay = clicks.reduce<Record<string, number>>((acc, click) => {
      const day = click.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});

    // Agrupa cliques por referrer
    const byReferrer = clicks.reduce<Record<string, number>>((acc, click) => {
      const ref = click.referrer ?? 'direct';
      acc[ref] = (acc[ref] ?? 0) + 1;
      return acc;
    }, {});

    return {
      code: link.code,
      url: link.url,
      totalClicks: link._count.clicks,
      byDay,
      byReferrer,
    };
  }
}
