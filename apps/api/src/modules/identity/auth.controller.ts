import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: { mobile: string; password: string; tenantId?: string; twoFactorCode?: string },
    @Req() req: Request
  ) {
    const tenantId = body.tenantId || req.tenantContext?.tenantId || 'tenant-pishro';
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Antigravity Client';
    const result = await this.authService.login(
      body.mobile,
      body.password,
      tenantId,
      body.twoFactorCode,
      clientIp,
      userAgent
    );
    return { success: true, ...result };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Req() req: Request) {
    const user = (req as any).user;
    const profile = await this.authService.getProfile(user.id, user.tenantId);
    return { success: true, data: profile };
  }
}
