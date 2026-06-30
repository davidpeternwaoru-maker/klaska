import { StudentProfile } from "@/components/people/StudentProfile";

// Next 16: dynamic route params are async.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentProfile studentId={id} />;
}
