import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { setCurrentOrgId } from "./org-state";
import { queryClient } from "./queryClient";

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

interface OrgContextValue {
  organizations: Organization[];
  activeOrg: Organization | null;
  activeOrgSlug: string | null;
  isLoading: boolean;
  switchOrg: (slug: string) => void;
}

const OrgContext = createContext<OrgContextValue>({
  organizations: [],
  activeOrg: null,
  activeOrgSlug: null,
  isLoading: true,
  switchOrg: () => {},
});

export function useOrg() {
  return useContext(OrgContext);
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isOrgRoute, params] = useRoute("/org/:orgSlug/*?");

  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const activeOrgSlug = isOrgRoute ? params?.orgSlug || null : null;

  const activeOrg = useMemo(() => {
    if (!activeOrgSlug || organizations.length === 0) return null;
    return organizations.find((o) => o.slug === activeOrgSlug) || null;
  }, [activeOrgSlug, organizations]);

  useEffect(() => {
    if (activeOrg) {
      setCurrentOrgId(activeOrg.id);
    } else if (organizations.length > 0 && !isOrgRoute) {
      setCurrentOrgId(organizations[0].id);
    }
  }, [activeOrg, organizations, isOrgRoute]);

  useEffect(() => {
    if (!isLoading && organizations.length > 0 && !isOrgRoute && location !== "/") {
      const defaultSlug = organizations[0].slug;
      const subPath = location.startsWith("/") ? location.slice(1) : location;
      setLocation(`/org/${defaultSlug}/${subPath}`);
    }
  }, [isLoading, organizations, isOrgRoute, location, setLocation]);

  const switchOrg = (slug: string) => {
    const currentSubPath = isOrgRoute && params?.["*"] ? params["*"] : "dashboard";
    setLocation(`/org/${slug}/${currentSubPath}`);
    const newOrg = organizations.find((o) => o.slug === slug);
    if (newOrg) {
      setCurrentOrgId(newOrg.id);
    }
    queryClient.invalidateQueries();
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        activeOrg,
        activeOrgSlug,
        isLoading,
        switchOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
