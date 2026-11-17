"use client";

import { useEffect } from "react";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";

export function ClerkActiveOrgSync({
  clerkOrgId,
}: {
  clerkOrgId?: string | null;
}) {
  const { organization } = useOrganization();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: true,
  });

  useEffect(() => {
    if (!isLoaded || !clerkOrgId || !setActive) return;

    // If active organization already matches, do nothing
    if (organization?.id === clerkOrgId) return;

    // Check if user is a member of this clerk organization
    const hasOrg = userMemberships?.data?.some(
      (m) => m.organization.id === clerkOrgId
    );

    if (hasOrg) {
      setActive({ organization: clerkOrgId }).catch((err) => {
        console.warn("[ClerkActiveOrgSync] Notice setting active org:", err);
      });
    }
  }, [isLoaded, clerkOrgId, organization?.id, userMemberships, setActive]);

  return null;
}
