declare module "next" {
  import type { NextConfig } from "next/dist/server/config";
  export type { NextConfig };
  export type Metadata = Record<string, unknown>;
}

declare module "next/navigation" {
  export function redirect(url: string): never;
  export function usePathname(): string;
  export function useRouter(): {
    push: (url: string) => void;
    refresh: () => void;
  };
}

declare module "next/headers" {
  export function headers(): Promise<Headers>;
}

declare module "next/link" {
  import type { AnchorHTMLAttributes, ReactNode } from "react";
  interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    children: ReactNode;
  }
  const Link: React.FC<LinkProps>;
  export default Link;
}

declare module "next-auth/react" {
  import type { ReactNode } from "react";

  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "COUNSELOR" | "STUDENT" | "UNIVERSITY_ADMIN";
      tenantId: string;
      avatarUrl?: string | null;
      image?: string | null;
      name?: string | null;
    };
    expires: string;
  }

  export function useSession(): {
    data: Session | null;
    status: "loading" | "authenticated" | "unauthenticated";
    update: (data?: Partial<Session>) => Promise<Session | null>;
  };

  export function signIn(
    provider?: string,
    options?: {
      email?: string;
      password?: string;
      redirect?: boolean;
      callbackUrl?: string;
    }
  ): Promise<{ error?: string; url?: string } | undefined>;

  export function signOut(options?: {
    redirect?: boolean;
    callbackUrl?: string;
  }): Promise<void>;

  export function SessionProvider({
    children,
  }: {
    children: ReactNode;
  }): React.JSX.Element;
}

declare module "next-auth" {
  interface AuthOptions {
    providers: any[];
    callbacks?: any;
    pages?: Record<string, string>;
    session?: any;
    secret?: string;
    adapter?: any;
    debug?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "COUNSELOR" | "STUDENT" | "UNIVERSITY_ADMIN";
      tenantId: string;
      avatarUrl?: string | null;
    };
    expires: string;
  }

  export function getServerSession(
    options: AuthOptions
  ): Promise<Session | null>;

  const NextAuth: (options: AuthOptions) => (req: any, ctx?: any) => Promise<Response>;
  export default NextAuth;
}

declare module "next-auth/providers/credentials" {
  interface CredentialsConfig<T> {
    id: string;
    name: string;
    type: string;
    credentials: T;
    authorize: (credentials: T extends { [key: string]: { label: string; type: string } } ? { [K in keyof T]: string } : any) => Promise<any>;
  }
  function CredentialsProvider<T extends Record<string, { label: string; type: string }>>(
    options: { id?: string; name: string; credentials: T; authorize: (credentials: { [K in keyof T]: string }) => Promise<any> }
  ): CredentialsConfig<T>;
  export default CredentialsProvider;
}

declare module "bcryptjs" {
  export function hash(password: string, salt: number): Promise<string>;
  export function compare(password: string, hash: string): Promise<boolean>;
}
