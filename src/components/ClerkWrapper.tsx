"use client";
import { ClerkProvider } from "@clerk/nextjs";

export default function ClerkWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#16845B",
          colorBackground: "#FFFFFF",
          colorText: "#172B25",
          colorTextSecondary: "#718078",
          colorInputBackground: "#FFFFFF",
          colorInputText: "#172B25",
          borderRadius: "0.75rem",
        } as any,
        elements: {
          card: "bg-white border border-[#E5EBE7] shadow-lg rounded-2xl",
          headerTitle: "text-[#172B25] font-bold",
          headerSubtitle: "text-[#718078]",
          formButtonPrimary: "bg-[#16845B] hover:bg-[#116B49] text-white rounded-xl font-semibold shadow-xs",
          socialButtonsBlockButton: "border border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9] rounded-xl font-medium",
          formFieldInput: "bg-white border border-[#E5EBE7] text-[#172B25] rounded-xl focus:border-[#16845B] focus:ring-2 focus:ring-[#16845B]/20",
          footerActionLink: "text-[#16845B] hover:underline font-medium",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
