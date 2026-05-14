import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  RawBodyRequest,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { Public } from "../auth/decorators/public.decorator";
import { BillingService } from "./billing.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Safe to expose in the browser (Stripe publishable key). Hosted Checkout works
   * without it; clients use this for Stripe.js, verification UI, etc.
   */
  @Get("stripe-publishable-key")
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: "Stripe publishable key (pk_…)" })
  @ApiResponse({ status: 200, description: "{ publishableKey } or null when unset." })
  stripePublishableKey(): { publishableKey: string | null } {
    const raw = this.config.get<string>("STRIPE_PUBLISHABLE_KEY")?.trim();
    const pk = raw?.startsWith("pk_") ? raw : null;
    return { publishableKey: pk };
  }

  @Post("checkout")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Create Stripe Checkout Session (subscription)" })
  @ApiBody({ type: CreateCheckoutDto })
  @ApiResponse({ status: 200, description: "Returns `{ url }` for redirect." })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 503, description: "Stripe or price not configured" })
  async checkout(
    @Body() dto: CreateCheckoutDto,
    @Req() req: Request & { user: { sub: number } },
  ): Promise<{ url: string }> {
    const userId = Number((req as Request & { user: { sub: unknown } }).user.sub);
    if (!Number.isFinite(userId)) {
      throw new BadRequestException("Invalid JWT subject.");
    }
    return this.billing.createCheckoutSession(userId, dto.planId);
  }

  @Post("webhook")
  /** Stripe may send bursts; skip global `ThrottlerGuard` from contents module */
  @SkipThrottle()
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: "Stripe webhook (signature verification; no JWT / API token).",
  })
  @ApiResponse({ status: 200, description: "Event received" })
  @ApiResponse({ status: 400, description: "Bad signature or payload" })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") stripeSignatureHeader?: string | string[],
  ): Promise<{ received: boolean }> {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException(
        "Raw body missing; ensure Nest is started with rawBody: true.",
      );
    }
    const hdr = req.headers["stripe-signature"];
    const sig = hdr ?? stripeSignatureHeader;
    await this.billing.handleStripeWebhook(raw, sig);
    return { received: true };
  }
}
