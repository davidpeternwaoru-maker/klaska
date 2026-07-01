import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Create your school · Klaska" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-[19px] font-bold tracking-tight text-ink">Create your account</h1>
      <p className="mb-5 mt-1 text-[13px] text-ink-3">Sign up as your school&apos;s main administrator. You&apos;ll set up the school next.</p>
      <SignupForm />
    </>
  );
}
