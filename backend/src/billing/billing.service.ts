import {
  BadRequestException,
  Injectable,
  Logger,
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

/** Stripe substitutes `{CHECKOUT_SESSION_ID}` before redirect — required for reliable return to the SPA. */
function appendStripeCheckoutSessionPlaceholder(url: string): string {
  if (url.includes("{CHECKOUT_SESSION_ID}")) {
    return url;
  }
  return url.includes("?") ?
      `${url}&session_id={CHECKOUT_SESSION_ID}`
    : `${url}?session_id={CHECKOUT_SESSION_ID}`;
}

/**
 * Hosted Checkout redirects the learner's browser to this URL after payment.
 * Historically SUCCESS was often copied as `/subscribe`, which skips the catalog.
 */
function resolveStripeCheckoutSuccessBase(
  successRaw: string | null | undefined,
  cancelTrim: string,
): string {
  let cancelParsed: URL;
  try {
    cancelParsed = new URL(cancelTrim);
  } catch {
    throw new ServiceUnavailableException(
      "STRIPE_CHECKOUT_CANCEL_URL must be a valid absolute URL (e.g. http://localhost:5173/subscribe).",
    );
  }
  const origin = cancelParsed.origin;

  const explicit = typeof successRaw === "string" ? successRaw.trim() : "";
  const baseCandidate =
    explicit.length > 0 ? explicit : `${origin}/catalog`;

  let resolved: URL;
  try {
    resolved = new URL(baseCandidate);
  } catch {
    throw new ServiceUnavailableException(
      `Invalid STRIPE_CHECKOUT_SUCCESS_URL: "${baseCandidate}". It must be a full absolute URL (e.g. http://localhost:5173/catalog).`,
    );
  }

  const pathClean = resolved.pathname.replace(/\/+$/, "") || "/";
  if (pathClean === "/subscribe") {
    resolved = new URL(`${origin}/catalog`);
  }

  return resolved.toString().replace(/\/+$/, "") || `${origin}/catalog`;
}

@Injectable()
export class BillingService {
  private readonly stripe: Stripe | null;
  private readonly logger = new Logger(BillingService.name);

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
    if (!cancelRaw?.trim()) {
      throw new ServiceUnavailableException(
        "STRIPE_CHECKOUT_CANCEL_URL must be set (absolute SPA URL). If STRIPE_CHECKOUT_SUCCESS_URL is empty, Stripe success redirect uses cancel URL origin + /catalog.",
      );
    }

    const cancelTrim = cancelRaw.trim();
    const successBase = resolveStripeCheckoutSuccessBase(
      successRaw,
      cancelTrim,
    );
    const successUrl = appendCheckoutSuccessQuery(
      appendStripeCheckoutSessionPlaceholder(successBase),
    );
    const cancelUrl = cancelTrim;

    this.logger.log(
      `Stripe Checkout redirect success_url=${successUrl} cancel_url=${cancelUrl}`,
    );
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Stripe webhook signature verification failed: ${msg}`);
      throw new BadRequestException("Invalid Stripe webhook signature.");
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    /** Writes subscription fields on `users` from a completed Checkout session (subscriptions mode). */
    const persistCheckoutSessionCompleted = async (
      session: Stripe.Checkout.Session,
    ): Promise<void> => {
      let userId = Number(
        session.metadata?.userId ?? session.client_reference_id ?? "",
      );
      let planId =
        typeof session.metadata?.planId === "string" ?
          session.metadata.planId.trim() || null
        : null;
      const customerId =
        typeof session.customer === "string" ?
          session.customer
        : session.customer && "id" in session.customer ?
          session.customer.id
        : null;
      let subId =
        typeof session.subscription === "string" ?
          session.subscription
        : session.subscription && typeof session.subscription === "object" &&
            "id" in session.subscription ?
          (session.subscription as { id: string }).id
        : null;

      let hydratedSub: Stripe.Subscription | undefined;
      if (subId) {
        try {
          hydratedSub = await this.stripe!.subscriptions.retrieve(subId);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(
            `Stripe checkout: subscriptions.retrieve(${subId}) failed: ${msg}`,
          );
        }
      }

      if (hydratedSub) {
        if (!Number.isFinite(userId) || userId <= 0) {
          userId = Number(hydratedSub.metadata?.userId ?? "");
        }
        if (!planId) {
          planId =
            typeof hydratedSub.metadata?.planId === "string" ?
              hydratedSub.metadata.planId.trim() || null
            : null;
        }
      }

      if (!Number.isFinite(userId) || userId <= 0 || !planId) {
        this.logger.warn(
          [
            `checkout session ${session.id ?? "?"} skipped DB update:`,
            "missing userId and/or planId after session + subscription hydrate.",
            `(client_reference_id=${session.client_reference_id}, meta.userId=${session.metadata?.userId})`,
          ].join(" "),
        );
        return;
      }

      const subscriptionStatusForDb = hydratedSub?.status ?? "active";

      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subId ?? undefined,
            subscriptionPlan: planId,
            subscriptionStatus: subscriptionStatusForDb,
          },
        });
        this.logger.log(
          `checkout.session persisted user=${userId} plan=${planId} sub=${subId ?? "(none)"} status=${subscriptionStatusForDb}`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `checkout.session Prisma update failed userId=${userId}: ${msg}`,
        );
        throw err;
      }
    };

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      await persistCheckoutSessionCompleted(session);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userIdMeta = Number(sub.metadata?.userId ?? "");
      const planFromMeta =
        typeof sub.metadata?.planId === "string" ?
          sub.metadata.planId.trim()
        : "";
      const status =
        event.type === "customer.subscription.deleted" ?
          "canceled"
        : sub.status;
      const id = String(sub.id);

      const customerRaw = sub.customer;
      const stripeCustomer =
        typeof customerRaw === "string" ? customerRaw
        : customerRaw !== null &&
            typeof customerRaw === "object" &&
            !("deleted" in customerRaw && (customerRaw as { deleted?: boolean }).deleted === true) &&
            "id" in customerRaw &&
            typeof (customerRaw as { id?: unknown }).id === "string" ?
          String((customerRaw as { id: string }).id)
        : null;

      const isDeleted = event.type === "customer.subscription.deleted";

      if (Number.isFinite(userIdMeta) && userIdMeta > 0) {
        try {
          await this.prisma.user.update({
            where: { id: userIdMeta },
            data: {
              subscriptionStatus: status,
              stripeSubscriptionId: isDeleted ? null : id,
              ...(stripeCustomer ? { stripeCustomerId: stripeCustomer } : {}),
              ...(planFromMeta ?
                { subscriptionPlan: planFromMeta }
              : {}),
            },
          });
          this.logger.log(
            `subscription.${event.type.split(".").pop()} persisted user=${userIdMeta} status=${status}`,
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `subscription event Prisma update failed userId=${userIdMeta}: ${msg}`,
          );
          throw err;
        }
      } else if (id) {
        const updateCount = await this.prisma.user.updateMany({
          where: { stripeSubscriptionId: id },
          data: {
            subscriptionStatus: status,
            ...(isDeleted ? { stripeSubscriptionId: null } : {}),
            ...(stripeCustomer ?
              { stripeCustomerId: stripeCustomer }
            : {}),
            ...(planFromMeta ?
              { subscriptionPlan: planFromMeta }
            : {}),
          },
        });
        this.logger.log(
          `subscription event updateMany stripeSubscriptionId=${id} matched=${updateCount.count} status=${status}`,
        );
      } else {
        this.logger.warn(
          `subscription event ${event.type} skipped: no userId meta and no subscription id`,
        );
      }
    }
  }
}
