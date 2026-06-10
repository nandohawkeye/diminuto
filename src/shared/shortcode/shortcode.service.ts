import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Hashids from 'hashids';
import { RedisService } from '../redis/redis.service';

const COUNTER_KEY = 'diminuto:counter';
// 62^4 = 14.776.336 — garante mínimo de 4 chars no código gerado
const COUNTER_OFFSET = 14_776_336;

@Injectable()
export class ShortcodeService {
  private hashids: Hashids;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const secret = this.config.getOrThrow<string>('HASHIDS_SECRET');
    this.hashids = new Hashids(secret, 4);
  }

  async generate(): Promise<string> {
    const counter = await this.redis.incr(COUNTER_KEY);
    const id = counter + COUNTER_OFFSET;
    return this.hashids.encode(id);
  }

  decode(code: string): number | null {
    try {
      const decoded = this.hashids.decode(code);
      if (!decoded.length) return null;
      return Number(decoded[0]) - COUNTER_OFFSET;
    } catch {
      return null;
    }
  }
}
