import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../prisma.service";

const CONSUMER_PLANS = ["light", "smart", "family"] as const;

function appendCheckoutSuccessQuery(url: string): string {
  if (/checkout[=]success/.test(url)) {
    return url;
  }
  return url.includes("?") ? `${url}&checkout=success` : `${url}?checkout=success`;
}

@Injectable()
export class BillingService {
  private readonly stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const key = this.config.get<string>("STRIPE_SECRET_KEY")?.trim();
    this.stripe =
      key ?
        new Stripe(key, {
          typescript: true,
        })
      : null;
  }

  private getPriceId(planId: string): string | undefined {
    const envKey =
      planId === "light" ? "STRIPE_PRICE_ID_LIGHT"
      : planId === "smart" ? "STRIPE_PRICE_ID_SMART"
      : planId === "family" ? "STRIPE_PRICE_ID_FAMILY"
      : "";
    const id = envKey ? this.config.get<string>(envKey) : undefined;
    return id?.trim() || undefined;
  }

  async createCheckoutSession(
    userId: number,
    planId: (typeof CONSUMER_PLANS)[number],
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        "Billing is not configured (missing STRIPE_SECRET_KEY).",
      );
    }
    if (!(CONSUMER_PLANS as readonly string[]).includes(planId)) {
      throw new BadRequestException("Invalid plan.");
    }
    const priceId = this.getPriceId(planId);
    if (!priceId) {
      throw new ServiceUnavailableException(
        `Stripe price is not configured for plan "${planId}".`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new BadRequestException("User not found.");
    }

    const successRaw = this.config.get<string>("STRIPE_CHECKOUT_SUCCESS_URL");
    const cancelRaw = this.config.get<string>("STRIPE_CHECKOUT_CANCEL_URL");
    if (!successRaw?.trim() || !cancelRaw?.trim()) {
      throw new ServiceUnavailableException(
        "STRIPE_CHECKOUT_SUCCESS_URL and STRIPE_CHECKOUT_CANCEL_URL must be set.",
      );
    }

    const successUrl = appendCheckoutSuccessQuery(successRaw.trim());
    const cancelUrl = cancelRaw.trim();

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: String(userId),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: String(userId),
        planId,
      },
      subscription_data: {
        metadata: {
          userId: String(userId),
          planId,
        },
      },
    });

    if (!session.url) {
      throw new ServiceUnavailableException("Stripe did not return a checkout URL.");
    }
    return { url: session.url };
  }

  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string | string[] | undefined,
  ): Promise<void> {
    if (!this.stripe) {
      throw new ServiceUnavailableException("Stripe is not configured.");
    }
    const whSecret = this.config.get<string>("STRIPE_WEBHOOK_SECRET")?.trim();
    if (!whSecret) {
      throw new ServiceUnavailableException("STRIPE_WEBHOOK_SECRET is not set.");
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;
    if (!sig) {
      throw new BadRequestException("Missing stripe-signature header.");
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, whSecret);
    } catch {
      throw new BadRequestException("Invalid Stripe webhook signature.");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userIdRaw =
        session.metadata?.userId ?? session.client_reference_id ?? "";
      const userId = Number(userIdRaw);
      const planId = session.metadata?.planId;
      const customerId =
        typeof session.customer === "string" ?
          session.customer
        : session.customer && "id" in session.customer ?
          session.customer.id
        : null;
      const subId =
        typeof session.subscription === "string" ?
          session.subscription
        : session.subscription && typeof session.subscription === "object" &&
            "id" in session.subscription ?
          (session.subscription as { id: string }).id
        : null;

      if (Number.isFinite(userId) && planId) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subId ?? undefined,
            subscriptionPlan: planId,
            subscriptionStatus: "active",
          },
        });
      }
    }
  }
}
