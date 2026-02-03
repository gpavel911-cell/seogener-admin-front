import type { DomainProfileDto, RegistrarType } from "@entities/domains/types";

export type RegistrarGroup = {
  registrar: RegistrarType;
  profiles: string[];
};

export const buildRegistrarGroups = (source: DomainProfileDto[]): RegistrarGroup[] => {
  const map = new Map<RegistrarType, Set<string>>();
  source.forEach((item) => {
    if (!map.has(item.registrar)) {
      map.set(item.registrar, new Set());
    }
    map.get(item.registrar)?.add(item.profile);
  });
  return Array.from(map.entries())
    .map(([registrar, profiles]) => ({
      registrar,
      profiles: Array.from(profiles).sort((a, b) => b.localeCompare(a)),
    }))
    .sort((a, b) => String(a.registrar).localeCompare(String(b.registrar)));
};
