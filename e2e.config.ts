import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

export default {
  targets: [
    {
      engine: web(),
      app: {
        url: "http://localhost:3000",
        command: {
          executable: "npm",
          args: ["run", "start", "--", "-p", "3000"],
          reuseExisting: true,
        },
      },
    },
  ],
} satisfies E2EConfig;
