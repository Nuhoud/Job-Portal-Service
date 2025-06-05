import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/public.decorator';
import { Reflector } from '@nestjs/core';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector: Reflector) {}
  
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    // console.log(token);
    return type === 'Bearer' ? token : undefined;
  }

  async canActivate(context: ExecutionContext,): Promise<boolean> {
    // check if the route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    // check if the route is protected
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
        // console.log('cannot Activate');
        throw new UnauthorizedException();
    }
    // console.log(token+' token');
    try {
      const payload = await this.jwtService.verifyAsync(
        token,
        {
          secret: process.env.JWT_SECRET
        }
      );
      // in express: req.user=decodedToken;
      request['user'] = payload;
    } catch (error) {
        throw new UnauthorizedException();
    }
    return true;
  }
}

