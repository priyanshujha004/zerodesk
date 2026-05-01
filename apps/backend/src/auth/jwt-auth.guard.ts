// P1 owns this — P2, P3, P4 import from here. Keep export name: JwtAuthGuard
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
