let currentOrgId: string | null = null;

export function setCurrentOrgId(id: string | null) {
  currentOrgId = id;
}

export function getCurrentOrgId(): string | null {
  return currentOrgId;
}
