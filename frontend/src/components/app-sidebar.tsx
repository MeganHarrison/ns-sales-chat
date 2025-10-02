"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SearchForm } from "@/components/search-form";
import { VersionSwitcher } from "@/components/version-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Navigation data for Nutrition Solutions
const data = {
  appName: "Nutrition Solutions",
  appDescription: "Meal Prep without the Prep",
  navMain: [
    {
      title: "Main",
      url: "/",
      items: [
        {
          title: "Dashboard",
          url: "/",
          isActive: true,
        },
        {
          title: "Orders",
          url: "/orders",
        },
        {
          title: "Subscriptions",
          url: "/subscriptions",
        },
        {
          title: "Contacts",
          url: "/contacts",
        },
        {
          title: "Products",
          url: "/products",
        },
        {
          title: "Reports",
          url: "/reports/orders-dashboard",
        },
        {
          title: "Request Offs",
          url: "/request-offs",
        },
        {
          title: "Active Clients",
          url: "/keap/active-clients",
        },
        {
          title: "Keap Contacts",
          url: "/keap/contacts",
        },
        {
          title: "Keap Orders",
          url: "/keap/orders",
        },
        {
          title: "Keap Tags",
          url: "/keap-tags",
        },
        {
          title: "Statistics",
          url: "/stats",
        },
        {
          title: "Resources",
          url: "/resources",
        },
        {
          title: "Documents",
          url: "/documents",
        },
        {
          title: "Data",
          url: "/data",
        },
      ],
    },
    {
      title: "AI Tools",
      url: "/nutrition-chat",
      items: [
        {
          title: "Nutrition AI Chat",
          url: "/nutrition-chat",
        },
      ],
    },
    {
      title: "Intercom",
      url: "/intercom-dashboard",
      items: [
        {
          title: "Intercom Dashboard",
          url: "/intercom-dashboard",
        },
        {
          title: "Intercom Conversations",
          url: "/intercom-conversations",
        },
        {
          title: "Intercom Messages",
          url: "/intercom-messages",
        },
        {
          title: "Intercom Tags",
          url: "/intercom-tags",
        },
        {
          title: "Intercom Users",
          url: "/intercom-users",
        },
      ],
    },
    {
      title: "Keap CRM",
      url: "/keap",
      items: [
        {
          title: "Sync Status",
          url: "/api/keap/sync",
        },
        {
          title: "API Debug",
          url: "/api/keap/debug",
        },
      ],
    },
    {
      title: "Management",
      url: "/dashboard2",
      items: [
        {
          title: "Business Dashboard",
          url: "/dashboard2",
        },
        {
          title: "Conflicts",
          url: "/dashboard2/conflicts",
        },
        {
          title: "Settings",
          url: "/dashboard2/settings",
        },
      ],
    },
    {
      title: "User Interface",
      url: "/buttons",
      items: [
        {
          title: "Buttons",
          url: "/buttons",
        },
        {
          title: "Images",
          url: "/images",
        },
        {
          title: "Form Elements",
          url: "/form-elements",
        },
      ],
    },
    {
      title: "Charts & Data",
      url: "/bar-chart",
      items: [
        {
          title: "Bar Chart",
          url: "/bar-chart",
        },
        {
          title: "Line Chart",
          url: "/line-chart",
        },
        {
          title: "Basic Tables",
          url: "/basic-tables",
        },
      ],
    },
    {
      title: "Account",
      url: "/profile",
      items: [
        {
          title: "Profile",
          url: "/profile",
        },
        {
          title: "Calendar",
          url: "/calendar",
        },
        {
          title: "Sign In",
          url: "/signin",
        },
        {
          title: "Sign Up",
          url: "/signup",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b">
        <div className="p-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <span className="text-lg font-bold">NS</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{data.appName}</span>
              <span className="text-xs text-muted-foreground">
                {data.appDescription}
              </span>
            </div>
          </Link>
        </div>
        <div className="px-4 pb-4">
          <SearchForm />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>{item.title}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
