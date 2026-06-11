import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../shared/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um usuário e retornar sem o password', async () => {
      const createdAt = new Date();
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id',
        email: 'teste@teste.com',
        createdAt,
      });

      const result = await service.create('teste@teste.com', '123456');

      expect(result).toEqual({
        id: 'user-id',
        email: 'teste@teste.com',
        createdAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('deve hashear o password antes de salvar', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id',
        email: 'teste@teste.com',
        createdAt: new Date(),
      });

      await service.create('teste@teste.com', '123456');

      const [[{ data }]] = mockPrismaService.user.create.mock.calls as [
        [{ data: { password: string } }],
      ];

      expect(data.password).not.toBe('123456');
      expect(await bcrypt.compare('123456', data.password)).toBe(true);
    });

    it('deve lançar ConflictException se o email já existir', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'teste@teste.com',
      });

      await expect(service.create('teste@teste.com', '123456')).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('deve retornar o usuário encontrado', async () => {
      const user = {
        id: 'user-id',
        email: 'teste@teste.com',
        password: 'hashed',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('teste@teste.com');

      expect(result).toEqual(user);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'teste@teste.com' },
      });
    });

    it('deve retornar null se o usuário não existir', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('inexistente@teste.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('deve retornar o usuário sem o password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'teste@teste.com',
        createdAt: new Date(),
      });

      const result = await service.findById('user-id');

      expect(result).not.toHaveProperty('password');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: { id: true, email: true, createdAt: true },
      });
    });
  });
});
