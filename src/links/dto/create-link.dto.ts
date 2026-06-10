import { IsUrl, IsOptional, IsDateString } from 'class-validator';

export class CreateLinkDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
