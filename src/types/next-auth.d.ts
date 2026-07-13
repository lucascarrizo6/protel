import type { UserRole } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      hotelId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    hotelId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    hotelId: string | null;
  }
}
