import { requireUser } from "@/lib/auth/session";
import { SectionTitle } from "@/components/ui/primitives";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const metadata = { title: "Change password · Klaska" };

// Self-service password change — any signed-in staff member, any role.
export default async function Page() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-[560px]">
      <SectionTitle
        eyebrow="My account"
        title="Change password"
        sub={`Signed in as ${user.email}. Pick a new password only you know.`}
      />
      <ChangePasswordForm />
    </div>
  );
}
