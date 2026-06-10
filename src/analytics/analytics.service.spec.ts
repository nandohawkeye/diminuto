import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../shared/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrismaService = {
  link: {
    findUnique: jest.fn(),
  },
  click: {
    findMany: jest.fn(),
  },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('deve retornar estatísticas do link', async () => {
      mockPrismaService.link.findUnique.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        url: 'https://youtube.com',
        userId: 'user-id',
        _count: { clicks: 3 },
      });

      mockPrismaService.click.findMany.mockResolvedValue([
        {
          id: 'click-1',
          referrer: 'https://google.com',
          createdAt: new Date('2026-06-10T10:00:00Z'),
        },
        {
          id: 'click-2',
          referrer: 'https://google.com',
          createdAt: new Date('2026-06-10T11:00:00Z'),
        },
        {
          id: 'click-3',
          referrer: null,
          createdAt: new Date('2026-06-10T12:00:00Z'),
        },
      ]);

      const result = await service.getStats('xK3p9q', 'user-id');

      expect(result).toEqual({
        code: 'xK3p9q',
        url: 'https://youtube.com',
        totalClicks: 3,
        byDay: { '2026-06-10': 3 },
        byReferrer: {
          'https://google.com': 2,
          direct: 1,
        },
      });
    });

    it('deve lançar NotFoundException se o link não existir', async () => {
      mockPrismaService.link.findUnique.mockResolvedValue(null);

      await expect(service.getStats('inexistente', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.click.findMany).not.toHaveBeenCalled();
    });

    it('deve lançar ForbiddenException se o link pertencer a outro usuário', async () => {
      mockPrismaService.link.findUnique.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        url: 'https://youtube.com',
        userId: 'outro-user-id',
        _count: { clicks: 0 },
      });

      await expect(service.getStats('xK3p9q', 'user-id')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.click.findMany).not.toHaveBeenCalled();
    });

    it('deve agrupar cliques por dia corretamente', async () => {
      mockPrismaService.link.findUnique.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        url: 'https://youtube.com',
        userId: 'user-id',
        _count: { clicks: 3 },
      });

      mockPrismaService.click.findMany.mockResolvedValue([
        {
          id: 'click-1',
          referrer: null,
          createdAt: new Date('2026-06-09T10:00:00Z'),
        },
        {
          id: 'click-2',
          referrer: null,
          createdAt: new Date('2026-06-09T15:00:00Z'),
        },
        {
          id: 'click-3',
          referrer: null,
          createdAt: new Date('2026-06-10T10:00:00Z'),
        },
      ]);

      const result = await service.getStats('xK3p9q', 'user-id');

      expect(result.byDay).toEqual({
        '2026-06-09': 2,
        '2026-06-10': 1,
      });
    });
  });
});
