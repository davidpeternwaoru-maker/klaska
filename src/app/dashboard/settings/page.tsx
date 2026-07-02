import { redirect } from "next/navigation";

// School settings live in the main app now.
export default function Page() {
  redirect("/settings");
}
