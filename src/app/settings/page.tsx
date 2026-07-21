import { requireCtx } from "@/server/context";
import { setupService } from "@/server/services/setup";
import { SectionTitle } from "@/components/ui/primitives";
import { SettingsTabs } from "@/components/dashboard/SettingsTabs";

// Real school settings, inside the main (polished) app shell — profile & branding,
// session & term, sections, grading and per-class fees. All data via setupService.
export default async function Page() {
  const user = await requireCtx();
  const v = await setupService.settingsView(user);
  if (!v) return null;

  return (
    <div className="mx-auto max-w-[1000px]">
      <SectionTitle eyebrow="School" title="Settings" sub="Your school profile, session & term, sections, grading and fees — all editable anytime." />
      <SettingsTabs {...v} />
    </div>
  );
}
