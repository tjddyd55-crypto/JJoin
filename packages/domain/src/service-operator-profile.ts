import { formatKoreanPhoneDisplay, normalizePhoneDigits } from './phone';

export const SERVICE_OPERATOR_PROFILE_ID = 'default';

export const SERVICE_OPERATOR_FIELD_MAX = {
  name: 120,
  registrationNumber: 20,
  address: 300,
  email: 120,
  phone: 20,
  hours: 200,
  department: 120,
  title: 80,
  ecommerceNumber: 80,
} as const;

export type ServiceOperatorProfileInput = {
  businessName?: string | null;
  brandName?: string | null;
  representativeName?: string | null;
  businessRegistrationNumber?: string | null;
  ecommerceRegistrationNumber?: string | null;
  corporateRegistrationNumber?: string | null;
  businessAddress?: string | null;
  customerServicePhone?: string | null;
  customerServiceEmail?: string | null;
  customerServiceHours?: string | null;
  privacyOfficerName?: string | null;
  privacyOfficerTitle?: string | null;
  privacyDepartment?: string | null;
  privacyEmail?: string | null;
  privacyPhone?: string | null;
  paymentInquiryPhone?: string | null;
  paymentInquiryEmail?: string | null;
};

export type ServiceOperatorProfileValues = {
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
};

export type ServiceOperatorCompletenessItem = {
  key: keyof ServiceOperatorProfileValues;
  label: string;
  requiredForProduction: boolean;
};

export const SERVICE_OPERATOR_COMPLETENESS_CHECKLIST: ServiceOperatorCompletenessItem[] = [
  { key: 'businessName', label: '상호 / 법인명', requiredForProduction: true },
  { key: 'brandName', label: '서비스 운영명', requiredForProduction: true },
  { key: 'representativeName', label: '대표자명', requiredForProduction: true },
  { key: 'businessRegistrationNumber', label: '사업자등록번호', requiredForProduction: true },
  { key: 'ecommerceRegistrationNumber', label: '통신판매업 신고번호', requiredForProduction: true },
  { key: 'businessAddress', label: '사업장 주소', requiredForProduction: true },
  { key: 'customerServicePhone', label: '고객센터 전화번호', requiredForProduction: true },
  { key: 'customerServiceEmail', label: '고객센터 이메일', requiredForProduction: true },
  { key: 'privacyOfficerName', label: '개인정보 보호책임자', requiredForProduction: true },
  { key: 'privacyEmail', label: '개인정보 문의 이메일', requiredForProduction: true },
];

function trimOrNull(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = trimOrNull(value, SERVICE_OPERATOR_FIELD_MAX.email);
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function normalizePhone(value: string | null | undefined): string | null {
  const trimmed = trimOrNull(value, SERVICE_OPERATOR_FIELD_MAX.phone);
  if (!trimmed) return null;
  const digits = normalizePhoneDigits(trimmed);
  return digits.length > 0 ? digits : null;
}

/** Store 10-digit business registration numbers without separators. */
export function normalizeBusinessRegistrationNumber(
  value: string | null | undefined,
): string | null {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 10);
  return digits.length > 0 ? digits : null;
}

export function formatBusinessRegistrationNumber(value: string | null | undefined): string | null {
  const digits = normalizeBusinessRegistrationNumber(value);
  if (!digits) return null;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

export function normalizeServiceOperatorProfile(
  input: ServiceOperatorProfileInput,
): ServiceOperatorProfileValues {
  return {
    businessName: trimOrNull(input.businessName, SERVICE_OPERATOR_FIELD_MAX.name),
    brandName: trimOrNull(input.brandName, SERVICE_OPERATOR_FIELD_MAX.name),
    representativeName: trimOrNull(input.representativeName, SERVICE_OPERATOR_FIELD_MAX.name),
    businessRegistrationNumber: normalizeBusinessRegistrationNumber(
      input.businessRegistrationNumber,
    ),
    ecommerceRegistrationNumber: trimOrNull(
      input.ecommerceRegistrationNumber,
      SERVICE_OPERATOR_FIELD_MAX.ecommerceNumber,
    ),
    corporateRegistrationNumber: trimOrNull(
      input.corporateRegistrationNumber,
      SERVICE_OPERATOR_FIELD_MAX.registrationNumber,
    ),
    businessAddress: trimOrNull(input.businessAddress, SERVICE_OPERATOR_FIELD_MAX.address),
    customerServicePhone: normalizePhone(input.customerServicePhone),
    customerServiceEmail: normalizeEmail(input.customerServiceEmail),
    customerServiceHours: trimOrNull(input.customerServiceHours, SERVICE_OPERATOR_FIELD_MAX.hours),
    privacyOfficerName: trimOrNull(input.privacyOfficerName, SERVICE_OPERATOR_FIELD_MAX.name),
    privacyOfficerTitle: trimOrNull(input.privacyOfficerTitle, SERVICE_OPERATOR_FIELD_MAX.title),
    privacyDepartment: trimOrNull(input.privacyDepartment, SERVICE_OPERATOR_FIELD_MAX.department),
    privacyEmail: normalizeEmail(input.privacyEmail),
    privacyPhone: normalizePhone(input.privacyPhone),
    paymentInquiryPhone: normalizePhone(input.paymentInquiryPhone),
    paymentInquiryEmail: normalizeEmail(input.paymentInquiryEmail),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateServiceOperatorProfileUpdate(
  input: ServiceOperatorProfileInput,
): { ok: true; value: ServiceOperatorProfileValues } | { ok: false; code: string } {
  const value = normalizeServiceOperatorProfile(input);

  const emailFields: Array<[string, string | null]> = [
    ['customer_service_email', value.customerServiceEmail],
    ['privacy_email', value.privacyEmail],
    ['payment_inquiry_email', value.paymentInquiryEmail],
  ];
  for (const [code, email] of emailFields) {
    if (email && !EMAIL_RE.test(email)) return { ok: false, code: `invalid_${code}` };
  }

  const phoneFields: Array<[string, string | null]> = [
    ['customer_service_phone', value.customerServicePhone],
    ['privacy_phone', value.privacyPhone],
    ['payment_inquiry_phone', value.paymentInquiryPhone],
  ];
  for (const [code, phone] of phoneFields) {
    if (phone && (phone.length < 8 || phone.length > 11)) {
      return { ok: false, code: `invalid_${code}` };
    }
  }

  if (
    value.businessRegistrationNumber &&
    value.businessRegistrationNumber.length !== 10
  ) {
    return { ok: false, code: 'invalid_business_registration_number' };
  }

  return { ok: true, value };
}

export function assessServiceOperatorCompleteness(
  profile: ServiceOperatorProfileValues,
): { complete: boolean; missingLabels: string[] } {
  const missingLabels = SERVICE_OPERATOR_COMPLETENESS_CHECKLIST
    .filter((item) => item.requiredForProduction && !profile[item.key]?.trim())
    .map((item) => item.label);
  return { complete: missingLabels.length === 0, missingLabels };
}

export type ServiceOperatorTemplateContext = Record<string, string>;

export function buildServiceOperatorTemplateContext(
  profile: ServiceOperatorProfileValues,
): ServiceOperatorTemplateContext {
  return {
    businessName: profile.businessName ?? '',
    brandName: profile.brandName ?? '',
    representativeName: profile.representativeName ?? '',
    businessRegistrationNumber:
      formatBusinessRegistrationNumber(profile.businessRegistrationNumber) ?? '',
    ecommerceRegistrationNumber: profile.ecommerceRegistrationNumber ?? '',
    corporateRegistrationNumber: profile.corporateRegistrationNumber ?? '',
    businessAddress: profile.businessAddress ?? '',
    customerServicePhone: formatKoreanPhoneDisplay(profile.customerServicePhone) ?? '',
    customerServiceEmail: profile.customerServiceEmail ?? '',
    customerServiceHours: profile.customerServiceHours ?? '',
    privacyOfficerName: profile.privacyOfficerName ?? '',
    privacyOfficerTitle: profile.privacyOfficerTitle ?? '',
    privacyDepartment: profile.privacyDepartment ?? '',
    privacyEmail: profile.privacyEmail ?? '',
    privacyPhone: formatKoreanPhoneDisplay(profile.privacyPhone) ?? '',
    paymentInquiryPhone: formatKoreanPhoneDisplay(profile.paymentInquiryPhone) ?? '',
    paymentInquiryEmail: profile.paymentInquiryEmail ?? '',
  };
}

/** Replace `{{key}}` placeholders; omit lines that become label-only after substitution. */
export function applyServiceOperatorTemplate(
  template: string,
  profile: ServiceOperatorProfileValues,
): string {
  const context = buildServiceOperatorTemplateContext(profile);
  const replaced = template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return context[key] ?? '';
  });

  const lines = replaced.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const withoutLabel = trimmed
      .replace(/^[^:]+:\s*/, '')
      .replace(/[|·]\s*$/, '')
      .trim();
    return withoutLabel.length > 0;
  });

  return lines.join('\n');
}

export type ServiceOperatorDisplayLine = { label: string; value: string };

export function buildServiceOperatorDisplayLines(
  profile: ServiceOperatorProfileValues,
): ServiceOperatorDisplayLine[] {
  const ctx = buildServiceOperatorTemplateContext(profile);
  const lines: ServiceOperatorDisplayLine[] = [];

  if (ctx.businessName || ctx.representativeName) {
    const value = [ctx.businessName, ctx.representativeName ? `대표 ${ctx.representativeName}` : '']
      .filter(Boolean)
      .join(' | ');
    if (value) lines.push({ label: '사업자', value });
  }
  if (ctx.businessRegistrationNumber) {
    lines.push({ label: '사업자등록번호', value: ctx.businessRegistrationNumber });
  }
  if (ctx.ecommerceRegistrationNumber) {
    lines.push({ label: '통신판매업 신고번호', value: ctx.ecommerceRegistrationNumber });
  }
  if (ctx.businessAddress) {
    lines.push({ label: '주소', value: ctx.businessAddress });
  }
  if (ctx.customerServicePhone || ctx.customerServiceEmail) {
    const value = [ctx.customerServicePhone, ctx.customerServiceEmail].filter(Boolean).join(' · ');
    if (value) lines.push({ label: '고객센터', value });
  }
  if (ctx.customerServiceHours) {
    lines.push({ label: '운영시간', value: ctx.customerServiceHours });
  }
  if (ctx.privacyOfficerName) {
    const officer = [ctx.privacyOfficerName, ctx.privacyOfficerTitle].filter(Boolean).join(' ');
    lines.push({ label: '개인정보 보호책임자', value: officer });
  }
  if (ctx.privacyEmail || ctx.privacyPhone) {
    const value = [ctx.privacyEmail, ctx.privacyPhone].filter(Boolean).join(' · ');
    if (value) lines.push({ label: '개인정보 문의', value });
  }

  return lines;
}
