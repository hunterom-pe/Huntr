import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(getPrisma()),
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // 1. Run the base logic from auth.config
      const updatedToken = await authConfig.callbacks?.jwt?.({ token, user, trigger, session }) ?? token;
      
      // 2. On initial sign in (Google, etc.), do a DB check for the profile
      if (user) {
        const prisma = getPrisma();
        const profile = await prisma.profile.findUnique({
          where: { userId: user.id },
          select: { id: true }
        });
        updatedToken.hasProfile = !!profile;
      }
      
      return updatedToken;
    },
  },
});
