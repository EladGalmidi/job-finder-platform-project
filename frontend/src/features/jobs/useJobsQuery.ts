import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  JOB_TABS,
  type JobQuery,
  type JobSort,
  type JobTab,
  type JobType,
  type RemoteMode,
  type RoleKey,
  type Seniority,
} from '@/types';

const SORTS: JobSort[] = ['relevance', 'newest', 'salaryDesc', 'salaryAsc'];

const list = (params: URLSearchParams, key: string): string[] => {
  const raw = params.get(key);
  return raw === null || raw === '' ? [] : raw.split(',');
};

const number = (params: URLSearchParams, key: string): number | null => {
  const raw = params.get(key);
  if (raw === null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export interface JobsQueryApi {
  readonly query: JobQuery;
  readonly setQuery: (patch: Partial<JobQuery>) => void;
  readonly clearFilters: () => void;
  readonly activeFilterCount: number;
}

/**
 * The jobs query lives in the URL, not in Redux.
 *
 * That makes back, forward, refresh and link sharing work for free, and removes
 * a whole class of bugs where a store copy of the filters drifts from what the
 * address bar says. Redux only caches the results keyed by this query.
 */
export const useJobsQuery = (): JobsQueryApi => {
  const [params, setParams] = useSearchParams();

  const query = useMemo<JobQuery>(() => {
    const tabParam = params.get('tab');
    const sortParam = params.get('sort');

    return {
      q: params.get('q') ?? '',
      roles: list(params, 'roles') as RoleKey[],
      locations: list(params, 'locations'),
      remoteModes: list(params, 'remoteModes') as RemoteMode[],
      jobTypes: list(params, 'jobTypes') as JobType[],
      seniorities: list(params, 'seniorities') as Seniority[],
      salaryMin: number(params, 'salaryMin'),
      sort: SORTS.includes(sortParam as JobSort) ? (sortParam as JobSort) : 'relevance',
      tab: JOB_TABS.includes(tabParam as JobTab) ? (tabParam as JobTab) : 'all',
      page: number(params, 'page') ?? 1,
    };
  }, [params]);

  const setQuery = useCallback(
    (patch: Partial<JobQuery>) => {
      const next = new URLSearchParams(params);

      const write = (key: string, value: string): void => {
        if (value === '') next.delete(key);
        else next.set(key, value);
      };

      if (patch.q !== undefined) write('q', patch.q);
      if (patch.roles !== undefined) write('roles', patch.roles.join(','));
      if (patch.locations !== undefined) write('locations', patch.locations.join(','));
      if (patch.remoteModes !== undefined) write('remoteModes', patch.remoteModes.join(','));
      if (patch.jobTypes !== undefined) write('jobTypes', patch.jobTypes.join(','));
      if (patch.seniorities !== undefined) write('seniorities', patch.seniorities.join(','));
      if (patch.salaryMin !== undefined) {
        write('salaryMin', patch.salaryMin === null ? '' : String(patch.salaryMin));
      }
      if (patch.sort !== undefined) write('sort', patch.sort === 'relevance' ? '' : patch.sort);
      if (patch.tab !== undefined) write('tab', patch.tab === 'all' ? '' : patch.tab);

      // Any change other than an explicit page move returns to the first page,
      // otherwise a narrower filter can land the user on an empty page 3.
      write('page', patch.page === undefined || patch.page === 1 ? '' : String(patch.page));

      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams();
    const tab = params.get('tab');
    const q = params.get('q');
    if (tab !== null) next.set('tab', tab);
    if (q !== null) next.set('q', q);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const activeFilterCount =
    query.roles.length +
    query.locations.length +
    query.remoteModes.length +
    query.jobTypes.length +
    query.seniorities.length +
    (query.salaryMin === null ? 0 : 1);

  return { query, setQuery, clearFilters, activeFilterCount };
};
