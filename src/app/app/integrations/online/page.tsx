import OnlineIntegrationsClient from "./OnlineIntegrationsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Online Integrations (Swiggy & Zomato) | RestroNex",
  description: "Enterprise Petpooja-inspired Swiggy & Zomato integration, multi-outlet mapping, master menu sync, KOT routing and reconciliation.",
};

export default function OnlineIntegrationsPage() {
  return <OnlineIntegrationsClient />;
}
