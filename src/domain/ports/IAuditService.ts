export interface AuditLogEntry {
  actorId: string;
  actorRole: 'ADMIN' | 'SYSTEM' | 'CUSTOMER';
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
}

export interface IAuditService {
  log(entry: AuditLogEntry): Promise<void>;
  getLogs(limit?: number): Promise<any[]>;
}
