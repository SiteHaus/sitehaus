import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const provided = req.headers['x-service-key'];
    const expected = this.config.getOrThrow('COMMERCE_SERVICE_KEY');
    return typeof provided === 'string' && provided === expected;
  }
}
