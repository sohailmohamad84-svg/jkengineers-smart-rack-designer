import { PrismaRackRepository } from '../repositories/PrismaRackRepository';
import { PrismaMaterialRepository } from '../repositories/PrismaMaterialRepository';
import { PrismaAuditService } from '../repositories/PrismaAuditService';
import { OTPServiceFactory } from '../otp/OTPServiceFactory';
import { IRackRepository } from '../../domain/ports/IRackRepository';
import { IMaterialRepository } from '../../domain/ports/IMaterialRepository';
import { IAuditService } from '../../domain/ports/IAuditService';
import { IOTPService } from '../../domain/ports/IOTPService';

export interface ServiceContainer {
  rackRepository: IRackRepository;
  materialRepository: IMaterialRepository;
  auditService: IAuditService;
  otpService: IOTPService;
}

class Container {
  private static instance: ServiceContainer;

  public static get(): ServiceContainer {
    if (!this.instance) {
      this.instance = {
        rackRepository: new PrismaRackRepository(),
        materialRepository: new PrismaMaterialRepository(),
        auditService: new PrismaAuditService(),
        otpService: OTPServiceFactory.getService(),
      };
    }
    return this.instance;
  }
}

export const container = Container.get();
