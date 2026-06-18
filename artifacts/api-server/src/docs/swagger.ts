import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../lib/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Avs Bucket List API',
      version: '1.0.0',
      description: 'API Documentation for Avs Bucket List',
    },
    servers: [
      {
        url: `/api/${env.API_VERSION}`,
        description: 'Current API Version',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Generate docs from route comments
};

export const swaggerSpec = swaggerJsdoc(options);
