import { requireAccess } from "@/server/context";
import { notificationsService } from "@/server/services/notifications";
import { SectionTitle } from "@/components/ui/primitives";
import { NotificationsCenter } from "@/components/dashboard/NotificationsCenter";

export const metadata = { title: "Notifications · Klaska" };

export default async function Page() {
  const user = await requireAccess("notifications");
  const rows = await notificationsService.list(user);

  return (
    <div className="mx-auto max-w-[900px]">
      <SectionTitle
        eyebrow="Settings"
        title="Notifications"
        sub="Message your staff or all parents at once, and manage automatic reminders like fee notices."
      />
      <NotificationsCenter notices={rows} />
    </div>
  );
}
