import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalPipes } from './config/global-pipes';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global pipes
  // Toggling the global pipes for validation and transformation across the app
  app.useGlobalPipes(...GlobalPipes);

  // Enable Swagger
  // Setting up Swagger for API documentation and testing
  setupSwagger(app);


  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
