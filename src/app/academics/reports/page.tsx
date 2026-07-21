import { redirect } from "next/navigation";

// The old whole-school "demo analysis" is superseded by the real, data-backed
// Report Analysis at /academics/analysis (buildSchoolAnalysis from saved scores).
// Keep this path as a permanent redirect so any old links still land somewhere real.
export default function Page() {
  redirect("/academics/analysis");
}
