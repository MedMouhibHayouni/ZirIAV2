import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Décorateur pour extraire l'utilisateur courant depuis la requête JWT.
 * Usage : @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
