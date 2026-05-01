// TODO P1: getConfig(tenantId) → { id, name, departments, aiPersona, primaryColor }
import { Injectable } from '@nestjs/common';
@Injectable()
export class TenantService {
  async getConfig(tenantId: string) {
    throw new Error('Not implemented — TODO P1');
  }
}
