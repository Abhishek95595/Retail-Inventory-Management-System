import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { db } from '@/backend/db';
import { users } from '@/backend/db/schema';
import { verifyPassword } from '@/lib/password';
import { loginSchema } from '@/shared/validations/auth';
import type { UserRole } from '@/shared/permissions';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours working shift session
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        // Query database for user
        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        // Generic rejection if user doesn't exist
        if (!user) {
          return null;
        }

        // Reject if account is deactivated
        if (!user.isActive) {
          return null;
        }

        // Verify Argon2id password hash
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // Return authenticated user payload (never include password hash)
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role as UserRole,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: UserRole }).role;
        token.isActive = (user as unknown as { isActive: boolean }).isActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as unknown as { id: string }).id = token.id as string;
        (session.user as unknown as { role: UserRole }).role = token.role as UserRole;
        (session.user as unknown as { isActive: boolean }).isActive = token.isActive as boolean;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
