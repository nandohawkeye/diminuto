import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@ApiTags('links')
@ApiBearerAuth()
@Controller('links')
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post()
  @ApiOperation({ summary: 'Criar link curto' })
  @ApiResponse({ status: 201, description: 'Link criado com sucesso' })
  @ApiResponse({ status: 400, description: 'URL inválida' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  create(@Body() dto: CreateLinkDto, @Req() req: AuthenticatedRequest) {
    return this.links.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar meus links' })
  @ApiResponse({
    status: 200,
    description: 'Lista de links com contagem de cliques',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.links.findAllByUser(req.user.id);
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar link' })
  @ApiResponse({ status: 204, description: 'Link deletado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Link pertence a outro usuário' })
  @ApiResponse({ status: 404, description: 'Link não encontrado' })
  delete(@Param('code') code: string, @Req() req: AuthenticatedRequest) {
    return this.links.delete(code, req.user.id);
  }
}
