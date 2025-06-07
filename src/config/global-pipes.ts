import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const GlobalPipes = [
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
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
