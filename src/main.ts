import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalPipes } from './config/global-pipes';
import { setupSwagger } from './config/swagger.config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // Enable global pipes
  // Toggling the global pipes for validation and transformation across the app
  app.useGlobalPipes(...GlobalPipes);

  // Enable Swagger
  // Setting up Swagger for API documentation and testing
  setupSwagger(app);

  try {
    const kafkaMicroservice = app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'jobportal',
          brokers: ['localhost:9092'],
        },
        consumer: {
          groupId: 'jobportal-consumer',
        },
      },
    });
    await app.startAllMicroservices();
  } catch (e) {
    console.log('Kafka connection failed, continuing without it');
  }

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
