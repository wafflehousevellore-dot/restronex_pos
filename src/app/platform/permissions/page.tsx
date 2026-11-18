export const dynamic = "force-dynamic";
import {
  ALL_PLATFORM_PERMISSIONS,
  ALL_PLATFORM_ROLES,
  PLATFORM_ROLE_DESCRIPTIONS,
  PLATFORM_ROLE_PERMISSIONS,
} from "@/lib/platform-roles";
import PermissionsAdminClient from "./PermissionsAdminClient";

export default function PlatformPermissionsPage() {
  return (
    <PermissionsAdminClient
      roles={ALL_PLATFORM_ROLES}
      permissions={ALL_PLATFORM_PERMISSIONS as unknown as string[]}
      rolePermissions={PLATFORM_ROLE_PERMISSIONS}
      descriptions={PLATFORM_ROLE_DESCRIPTIONS}
    />
  );
}
