import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  // @auth/prisma-adapter targets Auth.js v5's Adapter type, which is structurally
  // compatible with but nominally distinct from next-auth v4's — safe to cast.
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    // Credentials provider requires JWT sessions; database sessions aren't supported for it.
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hotelId: user.hotelId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.hotelId = user.hotelId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.hotelId = token.hotelId;
      }
      return session;
    },
  },
};
