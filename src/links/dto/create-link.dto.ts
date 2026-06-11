import { IsUrl, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLinkDto {
  @ApiProperty({ example: 'https://www.youtube.com' })
  @IsUrl({ require_protocol: true })
  url!: string;

  @ApiProperty({ example: '2026-12-31T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
