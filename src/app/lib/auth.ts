import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import clientPromise from './mongodb';
import bcrypt from 'bcryptjs';
import { UserDocument } from '../../types';
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        aadharNumber: { label: "Aadhar Number", type: "text" },
        password: { label: "Password", type: "password" },
        staffId: { label: "Staff ID", type: "text" },
        role: { label: "Role", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.aadharNumber || !credentials?.password || !credentials?.role) {
          throw new Error('Missing credentials');
        }

        try {
          const client = await clientPromise;
          const db = client.db('civic-reporter');
          
          const user = await db.collection<UserDocument>('users').findOne({
            aadharNumber: credentials.aadharNumber,
            role: credentials.role as 'citizen' | 'staff'
          });

          if (!user) {
            throw new Error('User not found');
          }

          // For staff, verify staffId
          if (credentials.role === 'staff') {
            if (!credentials.staffId || user.staffId !== credentials.staffId) {
              throw new Error('Invalid staff ID');
            }
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          return {
            id: user._id!.toString(),
            aadharNumber: user.aadharNumber,
            role: user.role,
            staffId: user.staffId
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.aadharNumber = user.aadharNumber;
        token.staffId = user.staffId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.aadharNumber = token.aadharNumber;
        session.user.staffId = token.staffId;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt'
  }
};
