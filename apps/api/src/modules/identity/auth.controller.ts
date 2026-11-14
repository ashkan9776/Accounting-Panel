import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { mobile: string; password: string; tenantId?: string },
    @Req() req: Request
  ) {
    const tenantId = body.tenantId || req.tenantContext?.tenantId || 'tenant-pishro';
    const result = await this.authService.login(body.mobile, body.password, tenantId);
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
