import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('links')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get(':code/stats')
  @ApiOperation({ summary: 'Estatísticas do link' })
  @ApiResponse({
    status: 200,
    description: 'Total de cliques, por dia e por referrer',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Link pertence a outro usuário' })
  @ApiResponse({ status: 404, description: 'Link não encontrado' })
  getStats(@Param('code') code: string, @Req() req: AuthenticatedRequest) {
    return this.analytics.getStats(code, req.user.id);
  }
}
