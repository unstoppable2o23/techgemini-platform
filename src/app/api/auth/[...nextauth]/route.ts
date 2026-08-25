import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

const GET = (req: any, context: any) => handler(req, context);
const POST = (req: any, context: any) => handler(req, context);

export { GET, POST };
