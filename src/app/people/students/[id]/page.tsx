import { requireAccess } from "@/server/context";
import { getStudentProfile } from "@/server/services/students-profile";
import { StudentProfile } from "@/components/people/StudentProfile";

// Next 16: dynamic route params are async.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAccess("students");
  const data = await getStudentProfile(user, id);
  return <StudentProfile data={data} />;
}
