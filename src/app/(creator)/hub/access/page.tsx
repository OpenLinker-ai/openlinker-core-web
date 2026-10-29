import { redirect } from "next/navigation";

// Issuing Agent Tokens moved into the Agent Token tab; keep old links working.
export default function CreatorHubAccessPage() {
  redirect("/hub/tokens");
}
