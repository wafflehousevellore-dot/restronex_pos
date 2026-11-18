import OnlineIntegrationsClient from "./OnlineIntegrationsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Online Integrations (Swiggy & Zomato) | RestroNex",
  description: "Enterprise Swiggy & Zomato online order integration, multi-outlet mapping, master menu sync, automated KOT routing and reconciliation.",
};

export default function OnlineIntegrationsPage() {
  return <OnlineIntegrationsClient />;
}
