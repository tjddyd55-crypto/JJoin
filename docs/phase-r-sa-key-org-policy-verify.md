# JJOIN — Effective Service Account Key Policy (gcloud verified)

Date: 2026-08-24
Account: tjddyd55@gmail.com
Project: jjoin-506406 (JJOIN)
Organization: 1037461829488

## Effective policy (updated 2026-08-24)

| Scope | Constraint | Configured | Effective |
|-------|------------|------------|-----------|
| organization | `iam.disableServiceAccountKeyCreation` | **enforce: true** (unchanged) | **enforce: true** |
| project jjoin-506406 | `iam.disableServiceAccountKeyCreation` | **override enforce: false** | **enforce: false** |
| organization | `iam.managed.disableServiceAccountKeyCreation` | POLICY_NOT_FOUND | enforce: false |
| project | `iam.managed.disableServiceAccountKeyCreation` | reset / untouched | enforce: false |

- project override: **적용됨** (classic only)
- org-level: **유지** (enforce true)
- managed: **미변경**
- **project effective (classic):** **false** ← 키 생성 허용

## Permission

- current account: `tjddyd55@gmail.com`
- project roles: `roles/owner`
- org roles include: `roles/orgpolicy.policyAdmin`, `roles/resourcemanager.organizationAdmin`
- `orgpolicy.policy.set` 가능 여부: **가능** (orgpolicy.policyAdmin 보유)

## Root cause

Organization-level policy  
`organizations/1037461829488/policies/iam.disableServiceAccountKeyCreation`  
**enforce: true**.

Project UI에서 “비활성”으로 보여도 **project override가 없어서** effective는 org 상속으로 **enforced**입니다.  
Managed constraint는 막지 않음. Classic constraint가 차단합니다.

## Required action (최소)

**옵션 A — Project override만 (권장, org 전체는 유지)**

1. [Org policies — project JJOIN](https://console.cloud.google.com/iam-admin/orgpolicies/iam-disableServiceAccountKeyCreation?project=jjoin-506406)
2. **Manage policy** / 수정
3. **Override parent's policy**
4. Rule: **Enforcement = Off** (Not enforced)
5. Save
6. 5–10분 대기 후 Firebase → Service accounts → Generate new private key 재시도

**옵션 B — Organization 전체 Off** (보안상 비권장)

1. 리소스 선택기를 **Organization**으로 변경
2. 동일 constraint → Enforce Off → Save

CLI로 에이전트가 설정 가능하면 사용자 확인 후 `gcloud org-policies set-policy`로 project override 적용 가능.

## Next

정책 effective=false 확인 전까지 Firebase SA key / EAS FCM 업로드 **진행 금지**.
