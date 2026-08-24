/**
 * Upload FCM V1 Google Service Account key to EAS (no secret logging).
 * Usage: node scripts/upload-eas-fcm-v1.mjs <path-to-sa.json>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SA_PATH = process.argv[2];
const PROJECT_ID = '7882917d-f3be-4832-bb62-754702a7d205';
const ANDROID_PACKAGE = 'com.jjoin.app';
const ACCOUNT_NAME = 'tjddyd55';
const GQL = 'https://api.expo.dev/graphql';

if (!SA_PATH || !fs.existsSync(SA_PATH)) {
  console.error('missing_sa_path');
  process.exit(1);
}

const statePath = path.join(os.homedir(), '.expo', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const sessionSecret = state?.auth?.sessionSecret;
if (!sessionSecret) {
  console.error('missing_expo_session');
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
if (!sa.client_email || !sa.private_key || !sa.project_id) {
  console.error('invalid_sa_shape');
  process.exit(1);
}

async function gql(query, variables) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'expo-session': sessionSecret,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new Error(msg);
  }
  return json.data;
}

const accountData = await gql(
  `query($name: String!) {
    account { byName(accountName: $name) { id name } }
  }`,
  { name: ACCOUNT_NAME },
);
const accountId = accountData?.account?.byName?.id;
if (!accountId) throw new Error('account_not_found');

const appData = await gql(
  `query($appId: String!) {
    app { byId(appId: $appId) { id fullName }
  }}`,
  { appId: PROJECT_ID },
);
// Expo uses project id as appId in some APIs — try alternate
let appId = appData?.app?.byId?.id;
if (!appId) {
  const byFullName = await gql(
    `query($fullName: String!) {
      app { byFullName(fullName: $fullName) { id fullName } }
    }`,
    { fullName: `@${ACCOUNT_NAME}/jjoin` },
  );
  appId = byFullName?.app?.byFullName?.id;
}
if (!appId) throw new Error('app_not_found');

console.log(JSON.stringify({ step: 'ids', accountId: 'SET', appId: 'SET', package: ANDROID_PACKAGE }));

const created = await gql(
  `mutation($googleServiceAccountKeyInput: GoogleServiceAccountKeyInput!, $accountId: ID!) {
    googleServiceAccountKey {
      createGoogleServiceAccountKey(
        googleServiceAccountKeyInput: $googleServiceAccountKeyInput
        accountId: $accountId
      ) {
        id
        clientEmail
        projectIdentifier
      }
    }
  }`,
  {
    accountId,
    googleServiceAccountKeyInput: { jsonKey: sa },
  },
);
const keyId = created?.googleServiceAccountKey?.createGoogleServiceAccountKey?.id;
const clientEmail = created?.googleServiceAccountKey?.createGoogleServiceAccountKey?.clientEmail;
if (!keyId) throw new Error('create_key_failed');
console.log(JSON.stringify({ step: 'uploaded', keyId: 'SET', clientEmailDomain: String(clientEmail || '').split('@')[1] || null }));

// Ensure android app credentials exist
let creds = await gql(
  `query($appId: String!, $applicationIdentifier: String!) {
    app {
      byId(appId: $appId) {
        byApplicationIdentifierAndroidAppCredentials(applicationIdentifier: $applicationIdentifier) {
          id
          googleServiceAccountKeyForFcmV1 { id clientEmail }
        }
      }
    }
  }`,
  { appId: PROJECT_ID, applicationIdentifier: ANDROID_PACKAGE },
).catch(() => null);

let androidAppCredentialsId =
  creds?.app?.byId?.byApplicationIdentifierAndroidAppCredentials?.id;

if (!androidAppCredentialsId) {
  const createdCreds = await gql(
    `mutation($appId: ID!, $applicationIdentifier: String!, $androidAppCredentialsInput: AndroidAppCredentialsInput!) {
      androidAppCredentials {
        createAndroidAppCredentials(
          androidAppCredentialsInput: $androidAppCredentialsInput
          appId: $appId
          applicationIdentifier: $applicationIdentifier
        ) { id }
      }
    }`,
    {
      appId,
      applicationIdentifier: ANDROID_PACKAGE,
      androidAppCredentialsInput: {},
    },
  );
  androidAppCredentialsId =
    createdCreds?.androidAppCredentials?.createAndroidAppCredentials?.id;
}

if (!androidAppCredentialsId) throw new Error('android_app_credentials_missing');

const assigned = await gql(
  `mutation($androidAppCredentialsId: ID!, $googleServiceAccountKeyId: ID!) {
    androidAppCredentials {
      setGoogleServiceAccountKeyForFcmV1(
        id: $androidAppCredentialsId
        googleServiceAccountKeyId: $googleServiceAccountKeyId
      ) {
        id
        googleServiceAccountKeyForFcmV1 { id clientEmail }
      }
    }
  }`,
  {
    androidAppCredentialsId,
    googleServiceAccountKeyId: keyId,
  },
);

const assignedEmail =
  assigned?.androidAppCredentials?.setGoogleServiceAccountKeyForFcmV1
    ?.googleServiceAccountKeyForFcmV1?.clientEmail;
console.log(
  JSON.stringify({
    step: 'assigned_fcm_v1',
    ok: Boolean(assignedEmail),
    clientEmailDomain: String(assignedEmail || '').split('@')[1] || null,
  }),
);
