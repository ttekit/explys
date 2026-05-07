import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) { }

  @Get()
  @ApiOperation({
    summary: 'Welcome endpoint',
    description: 'Returns a welcome message with API documentation link'
  })
  @ApiResponse({
    status: 200,
    description: 'Welcome message',
    schema: { example: 'Welcome to Explys API! Visit http://localhost:4200/api for Swagger documentation.' }
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('status')
  @ApiOperation({
    summary: 'API status',
    description: 'Returns current API status and version information'
  })
  @ApiResponse({
    status: 200,
    description: 'API status',
    schema: {
      example: {
        status: 'ok',
        message: 'API is running',
        timestamp: '2026-03-25T10:00:00.000Z',
        version: '1.0.0'
      }
    }
  })
  getStatus(): object {
    return this.appService.getStatus();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns API health status and uptime'
  })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    schema: {
      example: {
        health: 'healthy',
        uptime: 3600,
        timestamp: '2026-03-25T10:00:00.000Z'
      }
    }
  })
  getHealth(): object {
    return this.appService.getHealth();
  }

  @Get('genres')
  @ApiOperation({
    summary: 'Get all genres',
    description: 'Returns a list of all available genres from the database'
  })
  @ApiResponse({
    status: 200,
    description: 'List of genres retrieved successfully.'
  })
  async getGenres() {

    return this.prisma.genre.findMany();
  }
}
