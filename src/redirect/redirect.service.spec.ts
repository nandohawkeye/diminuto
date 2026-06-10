import { Test, TestingModule } from '@nestjs/testing';
import { RedirectService } from './redirect.service';
import { PrismaService } from '../shared/prisma/prisma.service';
import { RedisService } from '../shared/redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, GoneException } from '@nestjs/common';

const mockPrismaService = {
  link: {
    findUnique: jest.fn(),
  },
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

const meta = {
  ip: '127.0.0.1',
  referrer: 'https://google.com',
  userAgent: 'Mozilla/5.0',
};

describe('RedirectService', () => {
  let service: RedirectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedirectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<RedirectService>(RedirectService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolve', () => {
    it('deve retornar a URL do cache sem bater no banco', async () => {
      mockRedisService.get.mockResolvedValue('https://youtube.com');

      const url = await service.resolve('xK3p9q', meta);

      expect(url).toBe('https://youtube.com');
      expect(mockPrismaService.link.findUnique).not.toHaveBeenCalled();
    });

    it('deve emitir o evento click.created no cache hit', async () => {
      mockRedisService.get.mockResolvedValue('https://youtube.com');

      await service.resolve('xK3p9q', meta);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'click.created',
        expect.objectContaining({ linkId: 'xK3p9q' }),
      );
    });

    it('deve buscar no banco no cache miss e popular o cache', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.link.findUnique.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        url: 'https://youtube.com',
        expiresAt: null,
      });

      const url = await service.resolve('xK3p9q', meta);

      expect(url).toBe('https://youtube.com');
      expect(mockPrismaService.link.findUnique).toHaveBeenCalledWith({
        where: { code: 'xK3p9q' },
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'link:xK3p9q',
        'https://youtube.com',
        3600,
      );
    });

    it('deve lançar NotFoundException se o link não existir', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.link.findUnique.mockResolvedValue(null);

      await expect(service.resolve('inexistente', meta)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar GoneException se o link estiver expirado', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.link.findUnique.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        url: 'https://youtube.com',
        expiresAt: new Date('2020-01-01'), // data no passado
      });

      await expect(service.resolve('xK3p9q', meta)).rejects.toThrow(
        GoneException,
      );
    });

    it('deve emitir o evento click.created no cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.link.findUnique.mockResolvedValue({
        id: 'link-id',
        code: 'xK3p9q',
        url: 'https://youtube.com',
        expiresAt: null,
      });

      await service.resolve('xK3p9q', meta);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'click.created',
        expect.objectContaining({ linkId: 'link-id' }),
      );
    });
  });
});
