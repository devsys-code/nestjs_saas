import {
  TextFilter,
  EnumFilter,
  SearchFilter,
  OrderByFilter,
  BaseFilterDto,
  buildWhereFromMetadata,
  buildOrderByFromMetadata,
} from '../../common/filter';

export class UsrFilterDto extends BaseFilterDto {
  @SearchFilter(['email', 'name'])
  search?: string;

  @TextFilter({ description: 'Filter by email (contains)' })
  email?: string;

  @TextFilter({ description: 'Filter by name (contains)' })
  name?: string;

  @EnumFilter(['admin', 'member', 'viewer'], {
    message: 'role debe ser: admin, member o viewer',
    description: 'Filter by role',
  })
  role?: string;

  @OrderByFilter(
    [
      'id',
      'email',
      'name',
      'role',
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

export const buildUsrWhere = (
  filter: UsrFilterDto,
): Record<string, unknown> => {
  return buildWhereFromMetadata(filter, UsrFilterDto);
};

export const buildUsrOrderBy = (
  filter: UsrFilterDto,
): Record<string, unknown> => {
  return buildOrderByFromMetadata(filter, UsrFilterDto);
};
