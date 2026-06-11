import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { RedirectService } from './redirect.service';

@ApiTags('redirect')
@Controller()
export class RedirectController {
  constructor(private readonly redirectService: RedirectService) {}

  @Get(':code')
  @ApiOperation({ summary: 'Redirecionar para URL original' })
  @ApiResponse({
    status: 302,
    description: 'Redirecionamento para URL original',
  })
  @ApiResponse({ status: 404, description: 'Link não encontrado' })
  @ApiResponse({ status: 410, description: 'Link expirado' })
  async handleRedirect(
    @Param('code') code: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const url = await this.redirectService.resolve(code, {
      ip: req.ip,
      referrer: req.headers.referer,
      userAgent: req.headers['user-agent'],
    });
    return res.redirect(url, 302);
  }
}
