import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface Paginated<T> {
  count: number;
  page: number;
  size: number;
  next: number | null;
  previous: number | null;
  first: number | null;
  last: number | null;
  results: T[];
}

export interface PaginationQuery {
  page: number;
  size: number;
}

export interface PaginateExtra {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
}

export const Paginado = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PaginationQuery => {
    const query = ctx
      .switchToHttp()
      .getRequest<{ query: Record<string, string> }>().query;
    return {
      page: Math.max(parseInt(query.page, 10) || 1, 1),
      size: Math.max(parseInt(query.size, 10) || 0, 0),
    };
  },
);

interface PrismaDelegate {
  findMany: (args?: any) => Promise<unknown[]>;
  count: (args?: any) => Promise<number>;
}

export const paginate = async <T>(
  delegate: PrismaDelegate,
  query: PaginationQuery,
  extra?: PaginateExtra,
): Promise<Paginated<T>> => {
  const take = query.size > 0 ? query.size : undefined;
  const skip = take ? (query.page - 1) * take : 0;

  const countArgs = extra?.where ? { where: extra.where } : undefined;
  const findManyArgs: Record<string, unknown> = {
    skip,
    ...(extra?.where ? { where: extra.where } : {}),
    ...(extra?.orderBy ? { orderBy: extra.orderBy } : {}),
    ...(take ? { take } : {}),
  };

  const [count, results] = await Promise.all([
    delegate.count(countArgs),
    delegate.findMany(findManyArgs),
  ]);

  const first = count > 0 ? 1 : null;
  const last = take && count > 0 ? Math.ceil(count / take) : null;

  return {
    count,
    page: query.page,
    size: query.size,
    first,
    last,
    next: last && query.page < last ? query.page + 1 : null,
    previous: query.page > 1 ? query.page - 1 : null,
    results: results as T[],
  };
};
