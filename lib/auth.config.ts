import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { getPrisma } = await import("./prisma");
        const prisma = getPrisma();

        // 1. Check for Sandbox mode (hardcoded test account)
        if (credentials.email === "test@example.com" && credentials.password === "password") {
          const user = await prisma.user.upsert({
            where: { email: credentials.email as string },
            update: {},
            create: {
              email: credentials.email as string,
              name: "Test User",
            },
          });
          return user;
        }

        // 2. Check for real users in DB
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        // 3. Verify real user password
        const bcrypt = await import("bcryptjs");
        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (isValid) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.hasProfile = (user as { hasProfile?: boolean }).hasProfile;
      }
      if (trigger === "update" && session) {
        token.hasProfile = session.user?.hasProfile;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.hasProfile = !!token.hasProfile;
      }
      return session;
    },
    authorized() {
      return true;
    },
  },
} satisfies NextAuthConfig;
