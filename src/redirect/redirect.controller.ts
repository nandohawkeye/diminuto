import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { RedirectService } from './redirect.service';

@Controller()
export class RedirectController {
  constructor(private readonly redirectService: RedirectService) {}

  @Get(':code')
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
