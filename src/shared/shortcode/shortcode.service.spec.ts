import { Test, TestingModule } from '@nestjs/testing';
import { ShortcodeService } from './shortcode.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

const mockRedisService = {
  incr: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
};

describe('ShortcodeService', () => {
  let service: ShortcodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortcodeService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ShortcodeService>(ShortcodeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('deve gerar um código com pelo menos 4 caracteres', async () => {
      mockRedisService.incr.mockResolvedValue(1);

      const code = await service.generate();

      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThanOrEqual(4);
    });

    it('deve gerar códigos diferentes para contadores diferentes', async () => {
      mockRedisService.incr.mockResolvedValueOnce(1);
      const code1 = await service.generate();

      mockRedisService.incr.mockResolvedValueOnce(2);
      const code2 = await service.generate();

      expect(code1).not.toBe(code2);
    });

    it('deve chamar redis.incr com a chave correta', async () => {
      mockRedisService.incr.mockResolvedValue(1);

      await service.generate();

      expect(mockRedisService.incr).toHaveBeenCalledWith('diminuto:counter');
    });
  });

  describe('decode', () => {
    it('deve retornar null para um código inválido', () => {
      const result = service.decode('aaaa');
      expect(result).toBeNull();
    });

    it('deve decodificar um código gerado pelo generate', async () => {
      mockRedisService.incr.mockResolvedValue(1);

      const code = await service.generate();
      const decoded = service.decode(code);

      expect(decoded).not.toBeNull();
      expect(typeof decoded).toBe('number');
    });
  });
});
