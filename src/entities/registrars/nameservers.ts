import { RegistrarProviderType } from "./types";

export const defaultNameservers = (registrar?: RegistrarProviderType | null): string[] =>
  registrar === RegistrarProviderType.NAME_SILO
    ? ["ns1.dnsowl.com", "ns2.dnsowl.com", "ns3.dnsowl.com"]
    : ["ns1.reg.ru", "ns2.reg.ru"];

export const parseNameservers = (value: string): string[] =>
  [...new Set(value.split(/[\s,;]+/).map((host) => host.trim().toLowerCase()).filter(Boolean))];

export const validNameservers = (values: string[], registrar?: RegistrarProviderType | null): boolean =>
  values.length >= 2 && values.length <= (registrar === RegistrarProviderType.NAME_SILO ? 13 : 2) && values.every((host) =>
    host.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host));
