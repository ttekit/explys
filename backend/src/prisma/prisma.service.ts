import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@generated/prisma/client";
import { Pool } from "pg";
import { getDatabaseUrl } from "src/config/database-url";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
      const pool = new Pool({
        connectionString: getDatabaseUrl(),
      });
      const adapter = new PrismaPg(pool as any);
  
      super({ adapter } as any);
    }

  public async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect;
  }
}
