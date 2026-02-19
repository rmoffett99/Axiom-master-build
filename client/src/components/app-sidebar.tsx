import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  FileText, 
  Bell, 
  Eye,
  Plus,
  Settings,
  ChevronsUpDown,
  Check,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrg } from "@/lib/org-context";

function getNavItems(orgSlug: string | null) {
  const prefix = orgSlug ? `/org/${orgSlug}` : "";
  return [
    {
      title: "Dashboard",
      url: `${prefix}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: "Decisions",
      url: `${prefix}/decisions`,
      icon: FileText,
    },
    {
      title: "Alerts",
      url: `${prefix}/alerts`,
      icon: Bell,
    },
    {
      title: "Board Mode",
      url: `${prefix}/board`,
      icon: Eye,
    },
  ];
}

export function AppSidebar() {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { organizations, activeOrg, activeOrgSlug, switchOrg } = useOrg();

  const mainNavItems = getNavItems(activeOrgSlug);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 hover-elevate rounded-md p-1 -m-1 cursor-pointer">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight">AXIOM</span>
              <span className="text-xs text-muted-foreground">Decision Intelligence</span>
            </div>
          </div>
        </Link>

        {organizations.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between mt-3"
                size="sm"
                data-testid="button-org-switcher"
              >
                <span className="flex items-center gap-2 truncate">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{activeOrg?.name || "Select Space"}</span>
                </span>
                <ChevronsUpDown className="w-3 h-3 flex-shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrg(org.slug)}
                  data-testid={`menu-org-${org.slug}`}
                >
                  <span className="flex items-center gap-2 flex-1 truncate">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </span>
                  {activeOrg?.id === org.id && (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-3 mb-2">
            <Link href={activeOrgSlug ? `/org/${activeOrgSlug}/decisions/new` : "/decisions/new"} onClick={handleNavClick}>
              <Button className="w-full justify-start gap-2" size="sm" data-testid="button-new-decision">
                <Plus className="w-4 h-4" />
                New Decision
              </Button>
            </Link>
          </div>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url || (item.url.endsWith("/decisions") && location.includes("/decisions/")) || (item.url.endsWith("/alerts") && location.includes("/alerts"))}
                  >
                    <Link 
                      href={item.url} 
                      onClick={handleNavClick}
                      data-testid={`link-${item.title.toLowerCase().replace(" ", "-")}`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent/50">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">JD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">Admin</p>
          </div>
          <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid="button-settings">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
