/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-base-to-string */
export const FILTER_KEY = 'filter:metadata';

export type FilterType =
  | 'text'
  | 'boolean'
  | 'enum'
  | 'date'
  | 'dateRange'
  | 'multiId'
  | 'search'
  | 'orderBy';

export type TextMode = 'exact' | 'contains' | 'startsWith' | 'endsWith';

export interface FilterMetadata {
  type: FilterType;
  field?: string;
  fields?: string[];
  textMode?: TextMode;
  enumValues?: readonly string[];
  allowedOrderFields?: readonly string[];
  defaultOrderField?: string;
}

type FilterRecord = Record<string, unknown>;
type WhereClause = Record<string, unknown>;

const getMeta = (proto: object, key: string): FilterMetadata | undefined =>
  Reflect.getMetadata(FILTER_KEY, proto, key);

export const buildWhereFromMetadata = (
  filter: FilterRecord,
  dtoClass: new (...args: unknown[]) => unknown,
): WhereClause => {
  const where: WhereClause = {};
  const and: WhereClause[] = [];
  const proto = dtoClass.prototype;
  const processedDateFields = new Set<string>();

  for (const key of Object.keys(filter)) {
    const isDateSuffix = key.endsWith('_gte') || key.endsWith('_lte');
    const baseDateKey = isDateSuffix ? key.replace(/_(gte|lte)$/, '') : key;

    const dateMeta = getMeta(proto, baseDateKey);
    if (dateMeta && dateMeta.type === 'dateRange') {
      if (processedDateFields.has(baseDateKey)) continue;
      processedDateFields.add(baseDateKey);

      const field = dateMeta.field ?? baseDateKey;
      const exactVal = filter[baseDateKey];
      const gteVal = filter[`${baseDateKey}_gte`];
      const lteVal = filter[`${baseDateKey}_lte`];

      and.push(
        ...dateRangeClause(
          typeof exactVal === 'string' ? exactVal : undefined,
          typeof gteVal === 'string' ? gteVal : undefined,
          typeof lteVal === 'string' ? lteVal : undefined,
          field,
        ),
      );
      continue;
    }

    const meta = getMeta(proto, key);

    if (!meta) continue;

    const value = filter[key];
    if (value === undefined || value === null) continue;

    const field = meta.field ?? key;

    switch (meta.type) {
      case 'text': {
        const mode = meta.textMode ?? 'contains';
        if (mode === 'exact') {
          where[field] = value;
        } else {
          where[field] = { contains: value, mode: 'insensitive' };
        }
        break;
      }

      case 'boolean':
        where[field] = value === true || value === 'true';
        break;

      case 'enum':
        where[field] = value;
        break;

      case 'date':
        and.push(
          ...dateRangeClause(String(value), undefined, undefined, field),
        );
        break;

      case 'dateRange':
        break;

      case 'multiId': {
        const ids = String(value)
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (ids.length > 0) {
          where.id = { in: ids };
        }
        break;
      }

      case 'search':
        if (meta.fields && meta.fields.length > 0) {
          where.OR = meta.fields.map((f) => ({
            [f]: { contains: value, mode: 'insensitive' },
          }));
        }
        break;

      case 'orderBy':
        break;
    }
  }

  if (where.deleted_at === undefined) {
    const hasDeletedDateRange = and.some((clause) => clause.deleted_at);
    const isExplicitlyInactive =
      filter.is_active === false || filter.is_active === 'false';
    if (!hasDeletedDateRange && !isExplicitlyInactive) {
      where.deleted_at = null;
    }
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
};

const dateRangeClause = (
  exact: string | undefined,
  gte: string | undefined,
  lte: string | undefined,
  field: string,
): WhereClause[] => {
  const out: WhereClause[] = [];

  if (exact && exact.trim() && exact !== 'undefined') {
    const date = new Date(exact);
    if (!isNaN(date.getTime())) {
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setUTCHours(23, 59, 59, 999);
      out.push({ [field]: { gte: dayStart, lte: dayEnd } });
      return out;
    }
  }

  let start: Date | undefined;
  let end: Date | undefined;

  if (gte && gte.trim()) {
    const d = new Date(gte);
    if (!isNaN(d.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(gte.trim())) {
        d.setUTCHours(0, 0, 0, 0);
      }
      start = d;
    }
  }

  if (lte && lte.trim()) {
    const d = new Date(lte);
    if (!isNaN(d.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(lte.trim())) {
        d.setUTCHours(23, 59, 59, 999);
      }
      end = d;
    }
  }

  if (start && end) {
    out.push({ [field]: { gte: start, lte: end } });
  } else if (start) {
    out.push({ [field]: { gte: start } });
  } else if (end) {
    out.push({ [field]: { lte: end } });
  }

  return out;
};

export const buildOrderByFromMetadata = (
  filter: FilterRecord,
  dtoClass: new (...args: unknown[]) => unknown,
): WhereClause => {
  const proto = dtoClass.prototype;

  for (const key of Object.keys(filter)) {
    const meta = getMeta(proto, key);

    if (!meta || meta.type !== 'orderBy') continue;

    const value = filter[key];
    if (value === undefined || value === null) continue;

    const dir = filter.order_dir === 'asc' ? 'asc' : 'desc';
    const allowed = meta.allowedOrderFields ?? [];
    const stringValue = String(value);
    const field = allowed.includes(stringValue)
      ? stringValue
      : (meta.defaultOrderField ?? 'created_at');
    return { [field]: dir };
  }

  return { created_at: 'desc' };
};
