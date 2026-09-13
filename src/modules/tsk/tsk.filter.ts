import { TaskStatus } from '../../../generated/prisma/enums';
import {
  TextFilter,
  EnumFilter,
  SearchFilter,
  OrderByFilter,
  BaseFilterDto,
  buildWhereFromMetadata,
  buildOrderByFromMetadata,
} from '../../common/filter';

export class TaskFilterDto extends BaseFilterDto {
  @SearchFilter(['title', 'description'])
  search?: string;

  @TextFilter({ description: 'Filter by title (contains)' })
  title?: string;

  @TextFilter({ description: 'Filter by description (contains)' })
  description?: string;

  @EnumFilter(TaskStatus, {
    message: 'status debe ser: red, yellow o green',
    description: 'Filter by task status',
  })
  status?: TaskStatus;

  @OrderByFilter(
    [
      'id',
      'title',
      'description',
      'status',
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

export const buildTaskWhere = (
  filter: TaskFilterDto,
): Record<string, unknown> => {
  return buildWhereFromMetadata(filter, TaskFilterDto);
};

export const buildTaskOrderBy = (
  filter: TaskFilterDto,
): Record<string, unknown> => {
  return buildOrderByFromMetadata(filter, TaskFilterDto);
};
