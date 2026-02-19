import { useOrg } from "./org-context";

export function useOrgLink() {
  const { activeOrgSlug } = useOrg();
  
  return function orgLink(path: string): string {
    if (!activeOrgSlug) return path;
    if (path.startsWith("/org/")) return path;
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `/org/${activeOrgSlug}/${cleanPath}`;
  };
}
