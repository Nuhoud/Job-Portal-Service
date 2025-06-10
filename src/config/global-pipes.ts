import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const GlobalPipes = [
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    // This is the key setting - skip missing properties
    skipMissingProperties: true,
    // Allow empty values for optional properties
    skipNullProperties: false,
    skipUndefinedProperties: false,
    exceptionFactory: (errors: ValidationError[]) => {
      const formattedErrors = {};

      errors.forEach((error) => {
        const field = error.property;
        const constraints = error.constraints;

        if (constraints) {
          formattedErrors[field] = Object.values(constraints);
        }
      });

      return new BadRequestException({
        statusCode: 400,
        message: formattedErrors,
        error: 'Bad Request',
      });
    },
  }),
];
