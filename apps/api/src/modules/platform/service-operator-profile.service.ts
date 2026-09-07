import { BadRequestException, Injectable } from '@nestjs/common';
import {
  assessServiceOperatorCompleteness,
  buildServiceOperatorDisplayLines,
  formatBusinessRegistrationNumber,
  normalizeServiceOperatorProfile,
  SERVICE_OPERATOR_PROFILE_ID,
  validateServiceOperatorProfileUpdate,
  type ServiceOperatorProfileValues,
} from '@jjoin/domain';
import type {
  AdminServiceOperatorProfileDto,
  PublicServiceOperatorProfileDto,
} from '@jjoin/types';
import { updateServiceOperatorProfileSchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServiceOperatorProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(): Promise<PublicServiceOperatorProfileDto> {
    const row = await this.ensureRow();
    return this.toPublicDto(this.rowToValues(row));
  }

  async getAdminProfile(): Promise<AdminServiceOperatorProfileDto> {
    const row = await this.ensureRow();
    const values = this.rowToValues(row);
    const completeness = assessServiceOperatorCompleteness(values);
    return {
      ...this.toPublicDto(values),
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy ?? null,
      completeness,
    };
  }

  async updateAdminProfile(
    raw: unknown,
    actorUserId?: string,
  ): Promise<AdminServiceOperatorProfileDto> {
    const parsed = updateServiceOperatorProfileSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_service_operator_profile');

    const current = this.rowToValues(await this.ensureRow());
    const patch = parsed.data;
    const mergedInput = {
      ...current,
      ...(patch.businessName !== undefined ? { businessName: patch.businessName } : {}),
      ...(patch.brandName !== undefined ? { brandName: patch.brandName } : {}),
      ...(patch.representativeName !== undefined ? { representativeName: patch.representativeName } : {}),
      ...(patch.businessRegistrationNumber !== undefined
        ? { businessRegistrationNumber: patch.businessRegistrationNumber }
        : {}),
      ...(patch.ecommerceRegistrationNumber !== undefined
        ? { ecommerceRegistrationNumber: patch.ecommerceRegistrationNumber }
        : {}),
      ...(patch.corporateRegistrationNumber !== undefined
        ? { corporateRegistrationNumber: patch.corporateRegistrationNumber }
        : {}),
      ...(patch.businessAddress !== undefined ? { businessAddress: patch.businessAddress } : {}),
      ...(patch.customerServicePhone !== undefined
        ? { customerServicePhone: patch.customerServicePhone }
        : {}),
      ...(patch.customerServiceEmail !== undefined
        ? { customerServiceEmail: patch.customerServiceEmail }
        : {}),
      ...(patch.customerServiceHours !== undefined
        ? { customerServiceHours: patch.customerServiceHours }
        : {}),
      ...(patch.privacyOfficerName !== undefined
        ? { privacyOfficerName: patch.privacyOfficerName }
        : {}),
      ...(patch.privacyOfficerTitle !== undefined
        ? { privacyOfficerTitle: patch.privacyOfficerTitle }
        : {}),
      ...(patch.privacyDepartment !== undefined
        ? { privacyDepartment: patch.privacyDepartment }
        : {}),
      ...(patch.privacyEmail !== undefined ? { privacyEmail: patch.privacyEmail } : {}),
      ...(patch.privacyPhone !== undefined ? { privacyPhone: patch.privacyPhone } : {}),
      ...(patch.paymentInquiryPhone !== undefined
        ? { paymentInquiryPhone: patch.paymentInquiryPhone }
        : {}),
      ...(patch.paymentInquiryEmail !== undefined
        ? { paymentInquiryEmail: patch.paymentInquiryEmail }
        : {}),
    };
    const validation = validateServiceOperatorProfileUpdate(mergedInput);
    if (!validation.ok) throw new BadRequestException(validation.code);

    await this.prisma.serviceOperatorProfile.upsert({
      where: { id: SERVICE_OPERATOR_PROFILE_ID },
      create: {
        id: SERVICE_OPERATOR_PROFILE_ID,
        ...validation.value,
        updatedBy: actorUserId ?? null,
      },
      update: {
        ...validation.value,
        updatedBy: actorUserId ?? null,
      },
    });

    return this.getAdminProfile();
  }

  private async ensureRow() {
    return this.prisma.serviceOperatorProfile.upsert({
      where: { id: SERVICE_OPERATOR_PROFILE_ID },
      create: { id: SERVICE_OPERATOR_PROFILE_ID },
      update: {},
    });
  }

  private rowToValues(row: {
    businessName: string | null;
    brandName: string | null;
    representativeName: string | null;
    businessRegistrationNumber: string | null;
    ecommerceRegistrationNumber: string | null;
    corporateRegistrationNumber: string | null;
    businessAddress: string | null;
    customerServicePhone: string | null;
    customerServiceEmail: string | null;
    customerServiceHours: string | null;
    privacyOfficerName: string | null;
    privacyOfficerTitle: string | null;
    privacyDepartment: string | null;
    privacyEmail: string | null;
    privacyPhone: string | null;
    paymentInquiryPhone: string | null;
    paymentInquiryEmail: string | null;
  }): ServiceOperatorProfileValues {
    return normalizeServiceOperatorProfile(row);
  }

  private toPublicDto(values: ServiceOperatorProfileValues): PublicServiceOperatorProfileDto {
    return {
      businessName: values.businessName,
      brandName: values.brandName,
      representativeName: values.representativeName,
      businessRegistrationNumber: formatBusinessRegistrationNumber(
        values.businessRegistrationNumber,
      ),
      ecommerceRegistrationNumber: values.ecommerceRegistrationNumber,
      corporateRegistrationNumber: values.corporateRegistrationNumber,
      businessAddress: values.businessAddress,
      customerServicePhone: values.customerServicePhone,
      customerServiceEmail: values.customerServiceEmail,
      customerServiceHours: values.customerServiceHours,
      privacyOfficerName: values.privacyOfficerName,
      privacyOfficerTitle: values.privacyOfficerTitle,
      privacyDepartment: values.privacyDepartment,
      privacyEmail: values.privacyEmail,
      privacyPhone: values.privacyPhone,
      paymentInquiryPhone: values.paymentInquiryPhone,
      paymentInquiryEmail: values.paymentInquiryEmail,
      displayLines: buildServiceOperatorDisplayLines(values),
    };
  }
}
