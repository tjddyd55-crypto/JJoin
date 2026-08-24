# JJOIN — verify effective iam.disableServiceAccountKeyCreation policy
# Usage: after `gcloud auth login`, run from repo root:
#   powershell -File scripts/check-sa-key-org-policy.ps1

$ErrorActionPreference = 'Stop'
$gcloud = 'C:\Users\tjddy\google-cloud-sdk\bin\gcloud.cmd'
$ProjectId = 'jjoin-506406'
$Constraint = 'constraints/iam.disableServiceAccountKeyCreation'
$ManagedConstraint = 'constraints/iam.managed.disableServiceAccountKeyCreation'

if (-not (Test-Path $gcloud)) {
  $gcloud = 'gcloud'
}

Write-Host "=== Account ==="
& $gcloud auth list --format='table(account,status)'

Write-Host "`n=== Set project $ProjectId ==="
& $gcloud config set project $ProjectId | Out-Null

Write-Host "`n=== Project describe (parent) ==="
& $gcloud projects describe $ProjectId --format='yaml(name,projectId,projectNumber,parent,lifecycleState)'

Write-Host "`n=== Resource ancestors ==="
& $gcloud projects get-ancestors $ProjectId --format='table(id,type,displayName)'

$orgLine = & $gcloud projects get-ancestors $ProjectId --format='value(id,type)' | Where-Object { $_ -match '^[0-9]+\s+organization$' } | Select-Object -First 1
$orgId = if ($orgLine) { ($orgLine -split '\s+')[0] } else { $null }

Write-Host "`n=== Project-level policy (configured) ==="
& $gcloud org-policies describe $Constraint --project=$ProjectId --format=yaml 2>&1

Write-Host "`n=== Project-level policy (effective) ==="
& $gcloud org-policies describe $Constraint --project=$ProjectId --effective --format=yaml 2>&1

if ($orgId) {
  Write-Host "`n=== Organization-level policy (org=$orgId, configured) ==="
  & $gcloud org-policies describe $Constraint --organization=$orgId --format=yaml 2>&1

  Write-Host "`n=== Organization-level policy (effective) ==="
  & $gcloud org-policies describe $Constraint --organization=$orgId --effective --format=yaml 2>&1
}

Write-Host "`n=== Managed constraint (project effective) ==="
& $gcloud org-policies describe $ManagedConstraint --project=$ProjectId --effective --format=yaml 2>&1

Write-Host "`n=== Current account IAM on project ==="
$account = (& $gcloud config get-value account 2>$null).Trim()
if ($account) {
  & $gcloud projects get-iam-policy $ProjectId `
    --flatten='bindings[].members' `
    --filter="bindings.members:user:$account OR bindings.members:serviceAccount:$account" `
    --format='table(bindings.role)' 2>&1
}

if ($orgId -and $account) {
  Write-Host "`n=== Current account IAM on organization ==="
  & $gcloud organizations get-iam-policy $orgId `
    --flatten='bindings[].members' `
    --filter="bindings.members:user:$account OR bindings.members:serviceAccount:$account" `
    --format='table(bindings.role)' 2>&1
}

Write-Host "`n=== orgpolicy.policyAdmin check (project) ==="
if ($account) {
  & $gcloud iam roles describe roles/orgpolicy.policyAdmin --format='value(includedPermissions)' 2>&1 | Out-Null
  & $gcloud projects get-iam-policy $ProjectId --format=json 2>&1 | Out-Null
  Write-Host "(see IAM roles above for orgpolicy.policyAdmin / owner / editor)"
}

Write-Host "`nDone."
