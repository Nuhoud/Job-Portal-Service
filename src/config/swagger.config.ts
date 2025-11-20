// src/config/swagger.config.ts
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Nuhoud')
    .setDescription('The Nuhoud API description')
    .setVersion('1.0')
    .addServer('/NuhoudJob') 
    .addTag('Nuhoud')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
