import { PageSkeleton } from "@/components/ui/primitives";

// Global route loading state: while any screen fetches from the database, the
// shell stays put and the content area shows a calm, page-shaped shimmer —
// never a spinner.
export default function Loading() {
  return <PageSkeleton />;
}
