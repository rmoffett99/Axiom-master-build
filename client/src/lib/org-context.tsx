import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { getCurrentOrgId, setCurrentOrgId } from "./org-state";
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

function clearOrgScopedQueries() {
  queryClient.removeQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key !== "/api/organizations";
    },
  });
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isOrgRoute, params] = useRoute("/org/:orgSlug/*?");
  const prevOrgIdRef = useRef<string | null>(null);

  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const activeOrgSlug = isOrgRoute ? params?.orgSlug || null : null;

  const activeOrg = useMemo(() => {
    if (!activeOrgSlug || organizations.length === 0) return null;
    return organizations.find((o) => o.slug === activeOrgSlug) || null;
  }, [activeOrgSlug, organizations]);

  useLayoutEffect(() => {
    if (activeOrg) {
      const prevId = prevOrgIdRef.current;
      if (getCurrentOrgId() !== activeOrg.id) {
        setCurrentOrgId(activeOrg.id);
        if (prevId && prevId !== activeOrg.id) {
          clearOrgScopedQueries();
        }
      }
      prevOrgIdRef.current = activeOrg.id;
    } else if (!isOrgRoute && organizations.length > 0 && !getCurrentOrgId()) {
      setCurrentOrgId(organizations[0].id);
      prevOrgIdRef.current = organizations[0].id;
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
    const newOrg = organizations.find((o) => o.slug === slug);
    if (newOrg) {
      setCurrentOrgId(newOrg.id);
      prevOrgIdRef.current = newOrg.id;
    }
    clearOrgScopedQueries();
    setLocation(`/org/${slug}/${currentSubPath}`);
  };

  const needsRedirect = !isOrgRoute && location !== "/";
  const showLoading = isLoading || (isOrgRoute && !activeOrg) || needsRedirect;

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
      {showLoading ? (
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      ) : children}
    </OrgContext.Provider>
  );
}
