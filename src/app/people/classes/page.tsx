import { requireCtx } from "@/server/context";
import { classesService } from "@/server/services/classes";
import { canManageClasses } from "@/lib/auth/permissions";
import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ClassesManager } from "@/components/dashboard/ClassesManager";

export const metadata = { title: "Classes · Klaska" };

// Matrix: Owner/HOS manage classes. Teachers see ONLY their own classes,
// read-only; Bursar/Admin see the list read-only.
export default async function Page() {
  const user = await requireCtx();
  const manage = canManageClasses(user.role);

  const [rows, teachers] = await Promise.all([classesService.list(user), classesService.teacherOptions(user)]);

  if (manage) {
    return (
      <div className="mx-auto max-w-[1320px]">
        <SectionTitle eyebrow="People" title="Classes" sub="Your classes and arms, with form teachers and student counts." />
        <ClassesManager classes={rows} teachers={teachers} />
      </div>
    );
  }

  // read-only view (teacher: own classes only)
  return (
    <div className="mx-auto max-w-[1000px]">
      <SectionTitle
        eyebrow="People"
        title={user.role === "TEACHER" ? "My classes" : "Classes"}
        sub={user.role === "TEACHER" ? "The classes assigned to you." : "The school's classes — view only for your role."}
      />
      <Card pad={0} className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-ink-4">
            {user.role === "TEACHER" ? "No classes assigned to you yet — ask your admin to set you as form teacher." : "No classes yet."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-forest-soft text-forest">
                  <Icon name="layers" size={16} />
                </span>
                <span className="flex-1 text-[13.5px] font-medium text-ink">{c.arm ? `${c.name} ${c.arm}` : c.name}</span>
                {c.teacherName && <span className="text-[12.5px] text-ink-4">{c.teacherName}</span>}
                <Pill tone="neutral">{c.studentCount} students</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
