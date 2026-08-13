import { asCompanyId } from '@/types';
import type { Company } from '@/types';

/**
 * Fictional companies with Israeli-tech flavour. Deliberately not real
 * employers — nothing here should read as a genuine job listing.
 */
const company = (
  id: string,
  name: string,
  logoText: string,
  logoColor: string,
  industry: string,
  sizeRange: string,
): Company => ({
  id: asCompanyId(id),
  name,
  logoText,
  logoColor,
  industry,
  sizeRange,
  website: `https://${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com`,
});

export const COMPANIES: readonly Company[] = [
  company('co-nimbus', 'Nimbus Grid', 'NG', '#5c4ee5', 'Cloud Infrastructure', '200-500'),
  company('co-safeledger', 'SafeLedger', 'SL', '#0f766e', 'Fintech', '500-1000'),
  company('co-pulsemetric', 'PulseMetric', 'PM', '#b45309', 'Analytics', '80-200'),
  company('co-orbitcare', 'OrbitCare', 'OC', '#be123c', 'Health Tech', '50-80'),
  company('co-driftly', 'Driftly', 'DR', '#7c3aed', 'Logistics', '200-500'),
  company('co-kernelworks', 'KernelWorks', 'KW', '#1d4ed8', 'Developer Tools', '20-50'),
  company('co-verdantai', 'Verdant AI', 'VA', '#15803d', 'AI Platform', '80-200'),
  company('co-tandemhq', 'Tandem HQ', 'TH', '#c2410c', 'HR Tech', '50-80'),
] as const;

const COMPANY_BY_ID = new Map(COMPANIES.map((entry) => [entry.id, entry]));

export const findCompany = (id: string): Company => {
  const found = COMPANY_BY_ID.get(asCompanyId(id));
  if (found === undefined) {
    throw new Error(`Unknown company id in mock data: ${id}`);
  }
  return found;
};
