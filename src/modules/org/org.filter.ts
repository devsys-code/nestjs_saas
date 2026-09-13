import {
  TextFilter,
  SearchFilter,
  OrderByFilter,
  BaseFilterDto,
  buildWhereFromMetadata,
  buildOrderByFromMetadata,
} from '../../common/filter';

export class OrgFilterDto extends BaseFilterDto {
  @SearchFilter(['name', 'slug'])
  search?: string;

  @TextFilter({ description: 'Filter by name (contains)' })
  name?: string;

  @TextFilter({ description: 'Filter by slug (contains)' })
  slug?: string;

  @OrderByFilter(
    [
      'id',
      'name',
      'slug',
      'is_active',
      'created_at',
      'updated_at',
      'deleted_at',
    ],
    'created_at',
    { description: 'Sort field' },
  )
  order_by?: string;
}

export const buildOrgWhere = (
  filter: OrgFilterDto,
): Record<string, unknown> => {
  return buildWhereFromMetadata(filter, OrgFilterDto);
};

export const buildOrgOrderBy = (
  filter: OrgFilterDto,
): Record<string, unknown> => {
  return buildOrderByFromMetadata(filter, OrgFilterDto);
};
