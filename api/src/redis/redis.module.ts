import { Global, Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  let host = '127.0.0.1';
  let port = 6379;
  let username: string | undefined;
  let password: string | undefined;
  let db: number | undefined;

  try {
    const parsed = new URL(redisUrl);
    host = parsed.hostname;
    // On Windows/Docker environments, 'localhost' resolves to IPv6 (::1) which fails with ECONNREFUSED
    // if Redis is listening only on IPv4. We map localhost to 127.0.0.1 for reliability.
    if (host === 'localhost' || host === '::1' || !host) {
      host = '127.0.0.1';
    }
    port = parsed.port ? parseInt(parsed.port, 10) : 6379;
    if (parsed.username) username = decodeURIComponent(parsed.username);
    if (parsed.password) password = decodeURIComponent(parsed.password);
    if (parsed.pathname && parsed.pathname.length > 1) {
      const dbNum = parseInt(parsed.pathname.slice(1), 10);
      if (!isNaN(dbNum)) db = dbNum;
    }
  } catch {
    host = '127.0.0.1';
    port = 6379;
  }

  return {
    host,
    port,
    username: username || undefined,
    password: password || undefined,
    db: db !== undefined ? db : 0,
    family: 4, // Force IPv4
    maxRetriesPerRequest: null, // Strictly required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times: number) {
      return Math.min(times * 100, 3000);
    },
  };
}

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => {
        const options = getRedisConnectionOptions();
        const logger = new Logger('RedisModule');
        logger.log(
          `Configuring BullMQ Redis connection to ${options.host}:${options.port} (IPv4, db: ${options.db})`,
        );
        return {
          connection: options,
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class RedisModule {}
