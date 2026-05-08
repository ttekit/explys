import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to Explys API! Visit http://localhost:4200/api for Swagger documentation.';
  }

  getStatus(): object {
    return {
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  getHealth(): object {
    return {
      health: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

