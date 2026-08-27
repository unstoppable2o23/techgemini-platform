import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const limited = await rateLimit(
          `login:${credentials.email.trim().toLowerCase()}`,
          8,
          60
        );
        if (!limited.ok) {
          throw new Error("Too many attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        // Generic error for both "no such user" and "wrong password" to avoid
        // account enumeration.
        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid || !user.isActive || !user.tenant.isActive) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
