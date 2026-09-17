import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, throwError } from 'rxjs';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';
import { createHash } from 'crypto';

interface CacheEntry {
  expiresAt: number;
}

/**
 * Intercepteur d'Idempotence.
 * 
 * Stocke en mémoire vive un hachage de la requête (user + url + body) pendant
 * un délai donné (par défaut 60s). Si une requête identique survient dans ce
 * délai (ex: double clic ou mauvaise connexion rurale 3G), elle est rejetée avec 409 Conflict.
 * 
 * Note: Pour un déploiement multi-instances, on utiliserait Redis. Ici pour le
 * MVP 0-cost, une Map locale est parfaite.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor, OnModuleDestroy {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 60000; // 60 secondes
  private readonly MAX_ENTRIES = 5000;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private reflector: Reflector) {
    // Nettoyage périodique du cache en arrière-plan
    this.cleanupTimer = setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || 'anonymous';
    const method = request.method;
    const url = request.originalUrl;
    const bodyStr = JSON.stringify(request.body || {});

    // Générer une clé unique pour cette transaction
    const signature = `${userId}:${method}:${url}:${bodyStr}`;
    const hash = createHash('sha256').update(signature).digest('hex');

    const now = Date.now();
    const cached = this.cache.get(hash);

    if (cached && cached.expiresAt > now) {
      throw new ConflictException(
        'Transaction en double détectée. Veuillez patienter avant de réessayer.',
      );
    }

    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    this.cache.set(hash, { expiresAt: now + this.TTL_MS });

    return next.handle().pipe(
      catchError((err) => {
        this.cache.delete(hash);
        return throwError(() => err);
      }),
    );
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}
