import { requireAccess } from "@/server/context";
import { AppraisalWorkspace } from "@/components/people/AppraisalsPage";
import { getAppraisalsBoard, getOwnAppraisal } from "@/server/services/appraisals-read";

export const metadata = { title: "Appraisals · Klaska" };

// Matrix: Owner ALL (read) · HOS ALL · HOD their department · Teacher OWN ONLY.
// Bursar/Admin have no access (enforced by requireAccess + the service).
export default async function Page() {
  const user = await requireAccess("appraisals");

  // Teachers only ever load their OWN appraisal — never the board.
  if (user.role === "TEACHER") {
    const { appraisal, meta } = await getOwnAppraisal(user);
    return <AppraisalWorkspace viewerRole={user.role} viewerStaffId={user.staffId} board={[]} own={appraisal} meta={meta} viewerDepartment={null} />;
  }

  // HOS / Owner / HOD get the (role-scoped) board. HODs also get their own record.
  const [{ board, meta, viewerDepartment }, ownRes] = await Promise.all([
    getAppraisalsBoard(user),
    user.role === "HOD" ? getOwnAppraisal(user) : Promise.resolve(null),
  ]);
  return (
    <AppraisalWorkspace
      viewerRole={user.role}
      viewerStaffId={user.staffId}
      board={board}
      own={ownRes?.appraisal ?? null}
      meta={meta}
      viewerDepartment={viewerDepartment}
    />
  );
}
