import AcceptInvitationPage from "../page";

export default async function AcceptInvitationTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AcceptInvitationPage initialToken={token} />;
}
