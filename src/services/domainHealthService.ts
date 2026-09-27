import axiosInstance from '../utils/AxiosInstance';
import { systemStoresService } from './systemStoresService';

/**
 * Dashboard hostname health — whether `dash.<slug>.mel.iq` actually works.
 *
 * `dash.<slug>` is two labels deep, so the zone's `*.mel.iq` certificate does
 * not cover it: Total TLS issues a per-hostname certificate, and only for a
 * hostname that has an explicit proxied DNS record. A store whose record is
 * missing does not get a redirect or a 404 — the TLS handshake fails before
 * any HTTP happens, and the merchant reports that their dashboard is gone.
 *
 * Two ways that happens, both seen in production: a rename through a door that
 * did not sync Cloudflare, and a Cloudflare token that stopped working while
 * every provisioning call kept reporting success.
 *
 * **The record existing is not the hostname working.** Issuance is
 * asynchronous and can simply not get there, which is why everything here is a
 * live probe rather than a database read.
 */

export interface DashboardTlsRow {
  storeId: string;
  name: string | null;
  domain: string;
  /** `dash.<domain>.<root>` */
  host: string;
  /** A proxied A record exists for the hostname. */
  dnsOk: boolean;
  /** A TLS handshake completes — i.e. a certificate was actually presented. */
  tlsOk: boolean;
  ready: boolean;
  /** When the slug was last changed, when it has been. */
  renamedAt: string | null;
}

export interface DashboardTlsAudit {
  /** Cloudflare's own verdict on the server's API token. */
  credentials: { ok: boolean; reason?: string };
  /**
   * Totals over **every** store, not the page.
   *
   * "2 broken" has to mean two stores. A summary computed from the rows in
   * hand changes as you click through the table, which is worse than no
   * summary at all.
   */
  checked: number;
  readyCount: number;
  brokenCount: number;
  /** Every broken store, so the repair-all button knows its scope. */
  broken: DashboardTlsRow[];
  /** Just this page. */
  stores: DashboardTlsRow[];
  page: number;
  limit: number;
  /** Rows matching the current filter and search, across all pages. */
  total: number;
  totalPages: number;
  /** When the underlying sweep ran; it is cached for a minute. */
  cachedAt?: string;
  fromCache?: boolean;
  /**
   * True when this was assembled store-by-store in the browser because the
   * server does not have the audit route yet. Same answers, more requests.
   */
  degraded?: boolean;
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  status?: 'all' | 'broken' | 'ready';
  search?: string;
  /** Skip the server's one-minute cache. */
  refresh?: boolean;
}

export interface ProvisionResult {
  domain: string;
  host: string;
  ok: boolean;
  reason?: string;
}

interface DashboardReadyResponse {
  ready: boolean;
  host: string;
  dnsOk: boolean;
  tlsOk: boolean;
  domain: string;
}

/** Runs `task` over `items`, `limit` at a time. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    out.push(...(await Promise.all(items.slice(i, i + limit).map(task))));
  }
  return out;
}

const isNotFound = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 404;

/**
 * The reason the server gave, not axios's description of the status code.
 *
 * These endpoints fail for one interesting reason — Cloudflare refused, and
 * why — and that reason arrives in the Nest error body. `Request failed with
 * status code 503` tells an operator nothing they can act on, while
 * `Could not provision dash.playreview.mel.iq: Invalid API Token` tells them
 * exactly which credential to replace.
 */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const data = (
    error as { response?: { data?: { message?: unknown; error?: { message?: unknown } } } }
  )?.response?.data;

  const message = data?.message ?? data?.error?.message;
  if (typeof message === 'string' && message.trim()) return message;
  // Nest sends an array for validation failures.
  if (Array.isArray(message) && message.length) return message.join('، ');

  return fallback;
};

export const domainHealthService = {
  /**
   * Every active store's dashboard hostname, probed.
   *
   * Prefers `GET /domain/dashboard-tls-audit`, which does the whole sweep in
   * one request and also reports whether the server's Cloudflare credentials
   * are valid — one bad token explains every red row at once, and without that
   * line the page invites someone to repair twenty stores individually against
   * an API that is refusing all of them.
   *
   * That route is new. Against a server that predates it the call 404s, so the
   * sweep is assembled here instead from the store list plus the per-store
   * probe that has always existed. The rows are identical; what is lost is the
   * credentials line, which is why `degraded` is reported rather than hidden.
   */
  audit: async (query: AuditQuery = {}): Promise<DashboardTlsAudit> => {
    try {
      return (await axiosInstance.get<DashboardTlsAudit>(
        '/domain/dashboard-tls-audit',
        {
          params: {
            page: query.page,
            limit: query.limit,
            status: query.status,
            search: query.search || undefined,
            refresh: query.refresh ? 'true' : undefined,
          },
          // The first sweep probes every hostname; the shared 30s instance
          // default is not enough for a large estate on a cold cache.
          timeout: 120_000,
        },
      )) as unknown as DashboardTlsAudit;
    } catch (error) {
      if (!isNotFound(error)) throw error;
      return domainHealthService.auditFromStoreList(query);
    }
  },

  /**
   * The fallback sweep, one probe per store, for a server without the route.
   *
   * It pages **in the browser** after probing everything, because the counts
   * have to be over every store and the per-store endpoint is all this path
   * has. Slower than the server sweep by design — it is the compatibility
   * path, not the one to optimise.
   */
  auditFromStoreList: async (
    query: AuditQuery = {},
  ): Promise<DashboardTlsAudit> => {
    const list = await systemStoresService.getAllStores({ page: 1, limit: 200 });
    const stores = (list?.data ?? []).filter(
      (store) => !store.is_deleted && store.domain?.trim(),
    );

    // Bounded: each probe is a Cloudflare read plus a TLS handshake on the
    // server side. Firing one per store at once is how a health page becomes
    // the reason the API stopped answering.
    const rows = await mapLimit(stores, 8, async (store): Promise<DashboardTlsRow> => {
      const domain = store.domain as string;
      try {
        const probe = await domainHealthService.check(domain);
        return {
          storeId: store.id,
          name: store.name ?? null,
          domain,
          host: probe.host,
          dnsOk: probe.dnsOk,
          tlsOk: probe.tlsOk,
          ready: probe.ready,
          renamedAt: store.domain_last_update ?? null,
        };
      } catch {
        // A probe that could not run is not a hostname that works.
        return {
          storeId: store.id,
          name: store.name ?? null,
          domain,
          host: `dash.${domain}.mel.iq`,
          dnsOk: false,
          tlsOk: false,
          ready: false,
          renamedAt: store.domain_last_update ?? null,
        };
      }
    });

    const broken = rows.filter((row) => !row.ready);

    const status = query.status ?? 'all';
    const term = (query.search ?? '').trim().toLowerCase();
    const matching = rows
      .filter((row) =>
        status === 'broken' ? !row.ready : status === 'ready' ? row.ready : true,
      )
      .filter((row) =>
        term
          ? row.domain.toLowerCase().includes(term) ||
            (row.name ?? '').toLowerCase().includes(term)
          : true,
      );

    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const totalPages = Math.max(1, Math.ceil(matching.length / limit));
    const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);

    return {
      // Unknown rather than assumed good: this path cannot ask.
      credentials: { ok: true, reason: undefined },
      checked: rows.length,
      readyCount: rows.length - broken.length,
      brokenCount: broken.length,
      broken,
      stores: matching.slice((page - 1) * limit, page * limit),
      page,
      limit,
      total: matching.length,
      totalPages,
      degraded: true,
    };
  },

  /** One store, probed live. Exists on every server version. */
  check: async (domain: string): Promise<DashboardReadyResponse> =>
    (await axiosInstance.post<DashboardReadyResponse>('/domain/dashboard-ready', {
      domain,
    })) as unknown as DashboardReadyResponse,

  /**
   * Create or repair one store's `dash.<slug>` record.
   *
   * On a server that predates the reporting fix this answers 200 with
   * "provisioned" whether or not Cloudflare accepted anything, so the caller
   * must re-probe rather than believe it — which is what the page does.
   */
  provision: async (domain: string): Promise<{ message?: string; host?: string }> =>
    (await axiosInstance.post('/domain/provision-dashboard-dns', {
      domain,
    })) as unknown as { message?: string; host?: string },

  /** Repair every broken hostname in one call. */
  provisionAllBroken: async (): Promise<{
    message?: string;
    count?: number;
    failedCount?: number;
    results?: ProvisionResult[];
  }> =>
    (await axiosInstance.post('/domain/provision-all-dashboard-dns', {
      onlyBroken: true,
    })) as unknown as {
      message?: string;
      count?: number;
      failedCount?: number;
      results?: ProvisionResult[];
    },
};
