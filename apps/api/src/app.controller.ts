import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  root(@Res() res: Response) {
    return res.redirect('/api/docs');
  }

  @Public()
  @Get('api')
  apiRoot(@Res() res: Response) {
    return res.redirect('/api/docs');
  }

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
