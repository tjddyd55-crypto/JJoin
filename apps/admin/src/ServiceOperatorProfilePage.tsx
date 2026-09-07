import { useEffect, useState } from 'react';
import type {
  AdminServiceOperatorProfileDto,
  UpdateServiceOperatorProfileRequest,
} from '@jjoin/types';
import { formatBusinessRegistrationNumber } from '@jjoin/domain';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

type FieldDef = {
  key: keyof UpdateServiceOperatorProfileRequest;
  label: string;
  placeholder?: string;
};

const BUSINESS_FIELDS: FieldDef[] = [
  { key: 'businessName', label: '상호 / 법인명' },
  { key: 'brandName', label: '서비스 운영명 / 브랜드명' },
  { key: 'representativeName', label: '대표자명' },
  { key: 'businessRegistrationNumber', label: '사업자등록번호', placeholder: '123-45-67890' },
  { key: 'ecommerceRegistrationNumber', label: '통신판매업 신고번호' },
  { key: 'corporateRegistrationNumber', label: '법인등록번호 (선택)' },
  { key: 'businessAddress', label: '사업장 주소' },
];

const SUPPORT_FIELDS: FieldDef[] = [
  { key: 'customerServicePhone', label: '고객센터 전화번호' },
  { key: 'customerServiceEmail', label: '고객센터 이메일' },
  { key: 'customerServiceHours', label: '운영시간', placeholder: '평일 10:00~18:00' },
];

const PRIVACY_FIELDS: FieldDef[] = [
  { key: 'privacyOfficerName', label: '개인정보 보호책임자' },
  { key: 'privacyOfficerTitle', label: '보호책임자 직책 (선택)' },
  { key: 'privacyDepartment', label: '개인정보 담당부서' },
  { key: 'privacyEmail', label: '개인정보 문의 이메일' },
  { key: 'privacyPhone', label: '개인정보 문의 전화번호' },
];

const PAYMENT_FIELDS: FieldDef[] = [
  { key: 'paymentInquiryPhone', label: '결제 문의 전화번호' },
  { key: 'paymentInquiryEmail', label: '결제 문의 이메일' },
];

function displayValue(
  key: keyof UpdateServiceOperatorProfileRequest,
  profile: AdminServiceOperatorProfileDto,
): string {
  const raw = profile[key];
  if (raw == null) return '';
  if (key === 'businessRegistrationNumber') {
    return formatBusinessRegistrationNumber(String(raw)) ?? '';
  }
  return String(raw);
}

function FieldSection(props: {
  title: string;
  fields: FieldDef[];
  form: UpdateServiceOperatorProfileRequest;
  onChange: (key: keyof UpdateServiceOperatorProfileRequest, value: string) => void;
}) {
  return (
    <section className="card" style={{ padding: 16, marginBottom: 12 }}>
      <h2>{props.title}</h2>
      {props.fields.map((field) => (
        <label key={field.key} style={{ display: 'block', marginBottom: 12 }}>
          {field.label}
          <input
            style={{ display: 'block', width: '100%', marginTop: 4 }}
            value={props.form[field.key] ?? ''}
            onChange={(e) => props.onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </label>
      ))}
    </section>
  );
}

export function ServiceOperatorProfilePage({ api }: { api: ApiFn }) {
  const [profile, setProfile] = useState<AdminServiceOperatorProfileDto | null>(null);
  const [form, setForm] = useState<UpdateServiceOperatorProfileRequest>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api<AdminServiceOperatorProfileDto>('/admin/service-operator-profile').then((data) => {
      setProfile(data);
      setForm({
        businessName: displayValue('businessName', data),
        brandName: displayValue('brandName', data),
        representativeName: displayValue('representativeName', data),
        businessRegistrationNumber: displayValue('businessRegistrationNumber', data),
        ecommerceRegistrationNumber: displayValue('ecommerceRegistrationNumber', data),
        corporateRegistrationNumber: displayValue('corporateRegistrationNumber', data),
        businessAddress: displayValue('businessAddress', data),
        customerServicePhone: displayValue('customerServicePhone', data),
        customerServiceEmail: displayValue('customerServiceEmail', data),
        customerServiceHours: displayValue('customerServiceHours', data),
        privacyOfficerName: displayValue('privacyOfficerName', data),
        privacyOfficerTitle: displayValue('privacyOfficerTitle', data),
        privacyDepartment: displayValue('privacyDepartment', data),
        privacyEmail: displayValue('privacyEmail', data),
        privacyPhone: displayValue('privacyPhone', data),
        paymentInquiryPhone: displayValue('paymentInquiryPhone', data),
        paymentInquiryEmail: displayValue('paymentInquiryEmail', data),
      });
    });
  }, [api]);

  function onChange(key: keyof UpdateServiceOperatorProfileRequest, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await api<AdminServiceOperatorProfileDto>('/admin/service-operator-profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setProfile(updated);
      setMessage('저장되었습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>운영 정보</h1>
      {profile && !profile.completeness.complete ? (
        <section className="card" style={{ padding: 16, marginBottom: 12, borderColor: '#c0392b' }}>
          <strong>운영 정보 미완성</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            미입력: {profile.completeness.missingLabels.join(', ')}
          </p>
        </section>
      ) : null}
      <FieldSection title="사업자 정보" fields={BUSINESS_FIELDS} form={form} onChange={onChange} />
      <FieldSection title="고객센터" fields={SUPPORT_FIELDS} form={form} onChange={onChange} />
      <FieldSection title="개인정보 보호" fields={PRIVACY_FIELDS} form={form} onChange={onChange} />
      <FieldSection title="결제 문의" fields={PAYMENT_FIELDS} form={form} onChange={onChange} />
      <button disabled={busy} onClick={() => void save()}>저장</button>
      {profile?.updatedAt ? (
        <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
          최종 수정: {new Date(profile.updatedAt).toLocaleString('ko-KR')}
        </p>
      ) : null}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
