# Sync JJOIN API R2 env from CRM production S3 credentials (jjoinzone bucket).
$ErrorActionPreference = 'Stop'

function Set-JjoinR2Vars {
  param(
    [string]$ProjectId,
    [string]$Environment,
    [string]$PublicBaseUrl
  )

  railway link -p $ProjectId -e $Environment -s api | Out-Null
  $crm = railway variables --json | ConvertFrom-Json
  if (-not $crm.R2_ACCOUNT_ID) {
    throw 'CRM R2_ACCOUNT_ID missing'
  }

  railway variables --set "MEDIA_STORAGE_MODE=r2" `
    --set "R2_ACCOUNT_ID=$($crm.R2_ACCOUNT_ID)" `
    --set "R2_ACCESS_KEY_ID=$($crm.R2_ACCESS_KEY_ID)" `
    --set "R2_SECRET_ACCESS_KEY=$($crm.R2_SECRET_ACCESS_KEY)" `
    --set "R2_BUCKET=jjoinzone" `
    --set "R2_ENDPOINT=https://$($crm.R2_ACCOUNT_ID).r2.cloudflarestorage.com" `
    --set "R2_PUBLIC_BASE_URL=$PublicBaseUrl" | Out-Null
}

# Link CRM production to read credentials
railway link -p 6cf4357c-acf6-4862-a54b-4fa74b8563e9 -e production -s app | Out-Null
$crm = railway variables --json | ConvertFrom-Json
if (-not $crm.R2_ACCOUNT_ID) { throw 'CRM production R2 not available' }

$publicBase = $env:JJOIN_R2_PUBLIC_BASE_URL
if (-not $publicBase) {
  $publicBase = 'https://jjoinzone.r2.dev'
}

Set-JjoinR2Vars -ProjectId 'ed285149-eb8b-44a7-8188-b4b1406faca7' -Environment 'development' -PublicBaseUrl $publicBase
Set-JjoinR2Vars -ProjectId 'ed285149-eb8b-44a7-8188-b4b1406faca7' -Environment 'production' -PublicBaseUrl $publicBase

Write-Output 'JJOIN R2 env synced (development + production api)'
