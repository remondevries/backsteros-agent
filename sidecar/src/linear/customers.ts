import { linearGraphqlRequest } from "./graphql.ts";

export type LinearCustomerSummary = {
  id: string;
  name: string;
  slugId?: string;
  url?: string;
  domains: string[];
};

const MAX_PAGE_SIZE = 50;

const CUSTOMERS_PAGE_QUERY = `
  query LinearCustomers($first: Int!, $after: String, $filter: CustomerFilter) {
    customers(first: $first, after: $after, filter: $filter) {
      nodes {
        id
        name
        slugId
        url
        domains
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function normalizePageSize(first?: number): number {
  if (first == null || !Number.isFinite(first)) return MAX_PAGE_SIZE;
  return Math.min(Math.max(Math.floor(first), 1), MAX_PAGE_SIZE);
}

function normalizeCustomerNode(
  node: {
    id?: string;
    name?: string;
    slugId?: string | null;
    url?: string | null;
    domains?: string[] | null;
  } | null | undefined,
): LinearCustomerSummary | null {
  if (!node) return null;
  const id = node.id?.trim();
  const name = node.name?.trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    slugId: node.slugId?.trim() || undefined,
    url: node.url?.trim() || undefined,
    domains: (node.domains ?? []).map((domain) => domain.trim()).filter(Boolean),
  };
}

export type LinearCustomersPage = {
  customers: LinearCustomerSummary[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

export async function fetchLinearCustomersPage(
  options: {
    query?: string;
    after?: string | null;
    first?: number;
  } = {},
): Promise<LinearCustomersPage> {
  const first = normalizePageSize(options.first);
  const search = options.query?.trim();
  const filter = search ? { name: { containsIgnoreCase: search } } : undefined;

  const data = await linearGraphqlRequest<{
    customers?: {
      nodes?: Array<{
        id?: string;
        name?: string;
        slugId?: string | null;
        url?: string | null;
        domains?: string[] | null;
      }>;
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  }>(CUSTOMERS_PAGE_QUERY, {
    first,
    after: options.after ?? null,
    filter,
  });

  const page = data.customers;
  const customers: LinearCustomerSummary[] = [];
  for (const node of page?.nodes ?? []) {
    const customer = normalizeCustomerNode(node);
    if (customer) customers.push(customer);
  }

  customers.sort((left, right) => left.name.localeCompare(right.name));

  return {
    customers,
    pageInfo: {
      hasNextPage: page?.pageInfo?.hasNextPage ?? false,
      endCursor: page?.pageInfo?.endCursor ?? null,
    },
  };
}

export async function fetchLinearCustomers(options: { query?: string } = {}): Promise<LinearCustomerSummary[]> {
  const customers: LinearCustomerSummary[] = [];
  const seen = new Set<string>();
  let after: string | null = null;

  for (;;) {
    const page = await fetchLinearCustomersPage({
      query: options.query,
      after,
      first: MAX_PAGE_SIZE,
    });

    for (const customer of page.customers) {
      if (seen.has(customer.id)) continue;
      seen.add(customer.id);
      customers.push(customer);
    }

    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
    after = page.pageInfo.endCursor;
  }

  customers.sort((left, right) => left.name.localeCompare(right.name));
  return customers;
}
