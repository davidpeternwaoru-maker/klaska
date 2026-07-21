import { requireCtx } from "@/server/context";
import { overviewService } from "@/server/services/overview";
import { RealOverview } from "@/components/overview/RealOverview";
import { BursarOverview, TeacherOverview } from "@/components/overview/RoleOverviews";

// Role decides the view (Matrix §5): Owner = full (incl. money), HOS/HOD =
// academic, Bursar = finance, Teacher = own classes, Admin = basic records.
// All data comes from overviewService; the page only routes to the component.
export default async function Home() {
  const user = await requireCtx();

  if (user.role === "BURSAR") {
    const d = await overviewService.bursar(user);
    return <BursarOverview greet={d.greet} schoolName={d.schoolName} money={d.money} recentPayments={d.recentPayments} />;
  }

  if (user.role === "TEACHER") {
    const d = await overviewService.teacher(user);
    return <TeacherOverview greet={d.greet} schoolName={d.schoolName} classes={d.classes} presentToday={d.presentToday} myStudents={d.myStudents} />;
  }

  const d = await overviewService.general(user);
  return <RealOverview schoolName={d.schoolName} userName={d.userName} counts={d.counts} recent={d.recent} money={d.money} variant={d.variant} />;
}
