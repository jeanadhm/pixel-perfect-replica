import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDemo } from "@/lib/demo/store";
import { NAV } from "./nav";
import logo from "@/assets/ambs-logo.png";
import feather from "@/assets/ambs-feather.png";

export function AppSidebar() {
  const { workspace } = useDemo();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        {collapsed ? (
          <div className="grid size-8 place-items-center rounded-md bg-card p-0.5">
            <img src={feather} alt="AMBS" className="h-full object-contain" />
          </div>
        ) : (
          <div className="rounded-lg bg-card px-3 py-2">
            <img src={logo} alt="AMBS Agency" className="mx-auto h-11 object-contain" />
            <div className="mt-0.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Visibility Hub · SEO & GEO
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((g) => (
          <SidebarGroup key={g.group}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
              {g.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={it.url === "/" ? path === "/" : path.startsWith(it.url)}
                      tooltip={it.title}
                    >
                      <Link
                        to={it.url}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        <it.icon className="size-4" aria-hidden />
                        <span>{it.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <a
            href="https://ambs-agency.com"
            target="_blank"
            rel="noreferrer"
            className="mb-3 flex items-center justify-between rounded-lg border border-sidebar-border px-3 py-2.5 text-xs text-sidebar-foreground hover:bg-sidebar-accent"
          >
            ambs-agency.com
            <ExternalLink className="size-3" />
          </a>
        )}
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {workspace === "demo" ? "SB" : "AM"}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold text-sidebar-accent-foreground">
                  {workspace === "demo" ? "Sarah Benali" : "Équipe AMBS"}
                </div>
                <div className="truncate text-[11px] text-sidebar-foreground/70">
                  {workspace === "demo" ? "AMBS Agency · Head of Growth" : "Pilotage SEO & GEO"}
                </div>
              </div>
              <button
                aria-label="Informations sur le compte local"
                onClick={() =>
                  toast("Espace local", {
                    description: "Aucun compte distant ni session authentifiée n’est connecté.",
                  })
                }
                className="rounded p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
