import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { PrismaService } from 'src/prisma.service';
import { AlcorythmModule } from '../alcorythm/alcorythm.module';



@Module({
  imports: [
    AlcorythmModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
      signOptions: { expiresIn: '1d' },

    })
  ],

  controllers: [AuthController],
  providers: [PrismaService, AuthService],
})
export class AuthModule { }
