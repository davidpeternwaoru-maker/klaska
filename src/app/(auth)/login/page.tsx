import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in · Klaska" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-[19px] font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mb-5 mt-1 text-[13px] text-ink-3">Sign in to your school dashboard.</p>
      <LoginForm />
    </>
  );
}
