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
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post()
  create(@Body() dto: CreateLinkDto, @Req() req: AuthenticatedRequest) {
    return this.links.create(dto, req.user.id);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.links.findAllByUser(req.user.id);
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('code') code: string, @Req() req: AuthenticatedRequest) {
    return this.links.delete(code, req.user.id);
  }
}
