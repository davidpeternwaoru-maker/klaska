import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Create your school · Klaska" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-[19px] font-bold tracking-tight text-ink">Create your school</h1>
      <p className="mb-5 mt-1 text-[13px] text-ink-3">You&apos;ll be the owner. You can invite staff afterwards.</p>
      <SignupForm />
    </>
  );
}
