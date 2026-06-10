import { Test, TestingModule } from '@nestjs/testing';
import { LinksService } from './links.service';
import { PrismaService } from '../shared/prisma/prisma.service';
import { ShortcodeService } from '../shared/shortcode/shortcode.service';
import { RedisService } from '../shared/redis/redis.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrismaService = {
  link: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockShortcodeService = {
  generate: jest.fn().mockResolvedValue('xK3p9q'),
};

const mockRedisService = {
  set: jest.fn(),
  del: jest.fn(),
};

describe('LinksService', () => {
  let service: LinksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ShortcodeService, useValue: mockShortcodeService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um link e pre-popular o cache', async () => {
      const link = {
        id: 'link-id',
        code: 'xK3p9q',
        url: 'https://youtube.com',
        userId: 'user-id',
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.link.create.mockResolvedValue(link);

      const result = await service.create(
        { url: 'https://youtube.com' },
        'user-id',
      );

      expect(result).toEqual(link);
      expect(mockShortcodeService.generate).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'link:xK3p9q',
        'https://youtube.com',
        3600,
      );
    });

    it('deve salvar expiresAt quando fornecido', async () => {
      const expiresAt = '2026-12-31T00:00:00.000Z';
      mockPrismaService.link.create.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        url: 'https://youtube.com',
        userId: 'user-id',
        expiresAt: new Date(expiresAt),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(
        { url: 'https://youtube.com', expiresAt },
        'user-id',
      );

      const [[{ data }]] = mockPrismaService.link.create.mock.calls as [
        [{ data: { expiresAt: Date } }],
      ];
      expect(data.expiresAt).toEqual(new Date(expiresAt));
    });
  });

  describe('findAllByUser', () => {
    it('deve retornar os links do usuário', async () => {
      const links = [
        {
          id: 'link-1',
          code: 'abc123',
          url: 'https://google.com',
          _count: { clicks: 5 },
        },
        {
          id: 'link-2',
          code: 'def456',
          url: 'https://youtube.com',
          _count: { clicks: 2 },
        },
      ];
      mockPrismaService.link.findMany.mockResolvedValue(links);

      const result = await service.findAllByUser('user-id');

      expect(result).toEqual(links);
      expect(mockPrismaService.link.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { clicks: true } } },
      });
    });
  });

  describe('delete', () => {
    it('deve deletar o link e limpar o cache', async () => {
      mockPrismaService.link.findUnique.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        userId: 'user-id',
      });

      await service.delete('xK3p9q', 'user-id');

      expect(mockPrismaService.link.delete).toHaveBeenCalledWith({
        where: { code: 'xK3p9q' },
      });
      expect(mockRedisService.del).toHaveBeenCalledWith('link:xK3p9q');
    });

    it('deve lançar NotFoundException se o link não existir', async () => {
      mockPrismaService.link.findUnique.mockResolvedValue(null);

      await expect(service.delete('inexistente', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.link.delete).not.toHaveBeenCalled();
    });

    it('deve lançar ForbiddenException se o link pertencer a outro usuário', async () => {
      mockPrismaService.link.findUnique.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        userId: 'outro-user-id',
      });

      await expect(service.delete('xK3p9q', 'user-id')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.link.delete).not.toHaveBeenCalled();
    });
  });
});
