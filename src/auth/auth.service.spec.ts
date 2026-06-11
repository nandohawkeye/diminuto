import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mocked-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('deve registrar um usuário e retornar um token', async () => {
      mockUsersService.create.mockResolvedValue({
        id: 'user-id',
        email: 'teste@teste.com',
        createdAt: new Date(),
      });

      const result = await service.register('teste@teste.com', '123456');

      expect(result).toEqual({ token: 'mocked-token' });
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'teste@teste.com',
        '123456',
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'teste@teste.com',
      });
    });
  });

  describe('login', () => {
    it('deve logar e retornar um token com credenciais válidas', async () => {
      const hashed = await bcrypt.hash('123456', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-id',
        email: 'teste@teste.com',
        password: hashed,
      });

      const result = await service.login('teste@teste.com', '123456');

      expect(result).toEqual({ token: 'mocked-token' });
    });

    it('deve lançar UnauthorizedException se o usuário não existir', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('inexistente@teste.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se a senha estiver errada', async () => {
      const hashed = await bcrypt.hash('123456', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-id',
        email: 'teste@teste.com',
        password: hashed,
      });

      await expect(
        service.login('teste@teste.com', 'senha-errada'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
