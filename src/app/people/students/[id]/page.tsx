import { requireUser } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/students-profile";
import { StudentProfile } from "@/components/people/StudentProfile";

// Next 16: dynamic route params are async.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getStudentProfile(user, id);
  return <StudentProfile data={data} />;
}
