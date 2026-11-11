"use client";
import { AuthGate } from "@/components/auth/AuthGate";
import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { DemoStoreProvider, useDemo } from "@/lib/demo/store";
import { AppSidebar } from "./AppSidebar";
import { WorkspaceBar } from "./WorkspaceBar";
import { AppHeader } from "./AppHeader";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DemoStoreProvider>
      <AuthGate>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="min-w-0 bg-background">
              <AppHeader />
              <StorageNotice />
              <WorkspaceBar />
              <main
                id="main-content"
                className="mx-auto w-full max-w-[1440px] flex-1 p-4 md:p-6 lg:p-8"
              >
                <WorkspaceContent>{children}</WorkspaceContent>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </AuthGate>
      <Toaster richColors position="bottom-right" />
    </DemoStoreProvider>
  );
}

function StorageNotice() {
  const { error, saving } = useDemo();
  return !error && !saving ? null : (
    <p role="alert" className="border-b bg-warning/15 px-4 py-2 text-sm">
      {error || "Enregistrement des modifications…"}
    </p>
  );
}

function WorkspaceContent({ children }: { children: ReactNode }) {
  const { workspace, siteScope } = useDemo();
  return <div key={`${workspace}-${siteScope}`}>{children}</div>;
}
