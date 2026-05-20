import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import enDictionary from "@/app/[lang]/dictionaries/en.json";
import ruDictionary from "@/app/[lang]/dictionaries/ru.json";

// ============================================================================
// Configuration & Constants
// ============================================================================

const EMAIL_SUBJECTS = {
  en: {
    verify: "Verify your email address",
    reset: "Reset your password",
  },
  ru: {
    verify: "Подтвердите ваш email",
    reset: "Сброс пароля",
  },
} as const;

type SupportedLocale = keyof typeof EMAIL_SUBJECTS;

const RESET_EMAIL_CONTENT = {
  en: enDictionary.auth.resetPassword.email,
  ru: ruDictionary.auth.resetPassword.email,
} as const;

// Time constants (in seconds)
const TIME = {
  SESSION_EXPIRY: 60 * 60 * 24 * 30, // 30 days
  SESSION_UPDATE_AGE: 60 * 60 * 24, // 1 day
  PASSWORD_RESET_TOKEN_EXPIRY: 60 * 60, // 1 hour
  EMAIL_VERIFICATION_TOKEN_EXPIRY: 60 * 60 * 24, // 24 hours
} as const;

// ============================================================================
// Utilities
// ============================================================================

function getUserLocale(locale?: string): SupportedLocale {
  return locale === "ru" ? "ru" : "en";
}

function getBaseURL(): string {
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL environment variable is not set");
  }
  return baseURL;
}

function buildFrontendResetLink(
  rawUrl: string,
  locale: SupportedLocale,
): string {
  const baseURL = getBaseURL();
  const parsedUrl = new URL(rawUrl, baseURL);
  const token = parsedUrl.pathname.split("/").filter(Boolean).pop() ?? "";
  const callbackURL = parsedUrl.searchParams.get("callbackURL");

  const callbackTarget = callbackURL
    ? new URL(callbackURL, baseURL)
    : new URL(`/${locale}/reset-password`, baseURL);

  const targetPath =
    callbackTarget.pathname.startsWith("/en/") ||
    callbackTarget.pathname.startsWith("/ru/")
      ? callbackTarget.pathname
      : `/${locale}${callbackTarget.pathname}`;

  const resetLink = new URL(targetPath, callbackTarget.origin);
  if (token) {
    resetLink.searchParams.set("token", token);
  }

  return resetLink.toString();
}

// ============================================================================
// Database Setup
// ============================================================================

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ============================================================================
// Better Auth Configuration
// ============================================================================

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // ========== Email & Password Auth ==========
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        const locale = getUserLocale((user as { locale?: string }).locale);
        const resetLink = buildFrontendResetLink(url, locale);
        const content = RESET_EMAIL_CONTENT[locale];

        await sendEmail(
          user.email,
          EMAIL_SUBJECTS[locale].reset,
          `<p>${content.intro}</p><p><a href="${resetLink}">${content.cta}</a></p><p>${content.expiry}</p><p>${content.fallback}</p><p>${resetLink}</p>`,
        );
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error("Failed to send password reset email");
      }
    },
    resetPasswordTokenExpiresIn: TIME.PASSWORD_RESET_TOKEN_EXPIRY,
  },

  // ========== Email Verification ==========
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      try {
        const locale = getUserLocale((user as { locale?: string }).locale);
        const baseURL = getBaseURL();
        const verificationUrl = new URL(url, baseURL);
        verificationUrl.searchParams.set("locale", locale);
        verificationUrl.searchParams.set(
          "callbackURL",
          new URL(`/${locale}/dashboard`, baseURL).toString(),
        );

        await sendEmail(
          user.email,
          EMAIL_SUBJECTS[locale].verify,
          `<p>Click the link below to verify your email address.</p><p><a href="${verificationUrl.toString()}">Verify email</a></p>`,
        );
      } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email");
      }
    },
  },

  // ========== Session Management ==========
  session: {
    expiresIn: TIME.SESSION_EXPIRY,
    updateAge: TIME.SESSION_UPDATE_AGE,
  },

  // ========== User Schema ==========
  user: {
    additionalFields: {
      locale: {
        type: "string",
        defaultValue: "en",
      },
    },
    deleteUser: {
      enabled: true,
    },
  },

  // ========== Advanced Options ==========
  logger: {
    disabled: process.env.NODE_ENV === "production",
  },
  appName: "Family Tree",
  trustedOrigins: (process.env.TRUSTED_ORIGINS || "")
    .split(",")
    .filter(Boolean),
});
