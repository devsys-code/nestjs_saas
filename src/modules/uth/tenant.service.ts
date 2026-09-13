import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  organizacion_id: string = '';
  user_id: string = '';
  email: string = '';
  role: string = '';
}
