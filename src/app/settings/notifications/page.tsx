import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { NotificationsCenter, type NoticeRow } from "@/components/dashboard/NotificationsCenter";

export const metadata = { title: "Notifications · Klaska" };

export default async function Page() {
  const user = await requireUser();
  const notices = await prisma.notice.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const rows: NoticeRow[] = notices.map((n) => ({
    id: n.id,
    audience: n.audience,
    title: n.title,
    body: n.body,
    sentBy: n.sentBy,
    when: n.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
  }));

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
