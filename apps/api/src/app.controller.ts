import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  root(@Res() res: Response) {
    return res.redirect('/api/docs');
  }

  @Get('api')
  apiRoot(@Res() res: Response) {
    return res.redirect('/api/docs');
  }
}
