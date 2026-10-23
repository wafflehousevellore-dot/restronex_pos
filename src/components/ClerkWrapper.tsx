"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function ClerkWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        // @ts-expect-error clerk theme type mismatch handled at runtime
        baseTheme: dark,
        variables: { colorPrimary: "#3D954F", colorBackground: "#070B07" } as any,
        elements: {
          card: "bg-[#0F1F14] border border-white/10 shadow-xl",
          headerTitle: "text-white",
          headerSubtitle: "text-white/60",
          formButtonPrimary: "bg-[#3D954F] hover:bg-[#2e7a3e] text-white rounded-full",
          socialButtonsBlockButton: "border border-white/15 bg-white/5 text-white hover:bg-white/10",
          formFieldInput: "bg-white/5 border border-white/10 text-white",
          footerActionLink: "text-[#3D954F] hover:text-white",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
