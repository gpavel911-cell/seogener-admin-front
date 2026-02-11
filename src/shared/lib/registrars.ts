import type { RegistrarDomainProfileDto, RegistrarProviderType } from "@entities/registrars/types";

export type RegistrarGroup = {
  registrar: RegistrarProviderType;
  profiles: string[];
};

type RegistrarProfileLike = Partial<RegistrarDomainProfileDto> & {
  provider?: RegistrarProviderType | null;
  id?: string | null;
  profileId?: string | null;
  accountId?: string | null;
};

export const resolveRegistrarProvider = (item: RegistrarProfileLike): RegistrarProviderType | null => {
  return item.registrar ?? item.provider ?? null;
};

export const resolveRegistrarProfile = (item: RegistrarProfileLike): string | null => {
  return item.profile ?? item.id ?? item.profileId ?? item.accountId ?? null;
};

export const buildRegistrarGroups = (source: RegistrarDomainProfileDto[]): RegistrarGroup[] => {
  const map = new Map<RegistrarProviderType, Set<string>>();
  source.forEach((item) => {
    const registrar = resolveRegistrarProvider(item);
    const profile = resolveRegistrarProfile(item);
    if (!registrar || !profile) {
      return;
    }
    if (!map.has(registrar)) {
      map.set(registrar, new Set());
    }
    map.get(registrar)?.add(profile);
  });
  return Array.from(map.entries())
    .map(([registrar, profiles]) => ({
      registrar,
      profiles: Array.from(profiles).sort((a, b) => b.localeCompare(a)),
    }))
    .sort((a, b) => String(a.registrar).localeCompare(String(b.registrar)));
};
