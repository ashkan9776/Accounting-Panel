import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false
    })
  );

  // مستندسازی جامع OpenAPI / Swagger به زبان فارسی
  const config = new DocumentBuilder()
    .setTitle('پلتفرم جامع حسابداری و مالی ایرانی (API Core)')
    .setDescription('مستندات وب‌سرویس‌های هسته حسابداری، ثبت اسناد دوبل، کدینگ، دفاتر قانونی، قوانین نسخه‌دار و زنجیره ممیزی')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`[NestJS API Core] Running on: http://localhost:${port}`);
  console.log(`[Swagger Docs] Available at: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]', err);
  process.exit(1);
});
