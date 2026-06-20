import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/domain-error";
import { statusForCode } from "@/lib/error-status";
import type { PrismaClient } from "@/generated/prisma/client";

export interface SessionContext {
  prisma: PrismaClient;
  user: { id: string; [key: string]: unknown };
  request: NextRequest;
}

type SessionHandler = (ctx: SessionContext) => Promise<Response>;

export function withSession(handler: SessionHandler) {
  return async (request: NextRequest): Promise<Response> => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return Response.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    try {
      return await handler({ prisma, user: session.user, request });
    } catch (error) {
      if (error instanceof DomainError) {
        return Response.json(
          { errorCode: error.code },
          { status: statusForCode(error.code) },
        );
      }
      console.error("Unhandled error in route handler:", error);
      return Response.json(
        { errorCode: "ERR_INTERNAL" },
        { status: 500 },
      );
    }
  };
}
