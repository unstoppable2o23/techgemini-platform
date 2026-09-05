"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Password resets are handled by your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your counselor or organization administrator can set a new password
            for your account from the Students page. If you do not know who to
            contact, reach out to your study-abroad agency.
          </p>
          <Link href="/auth/login">
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}