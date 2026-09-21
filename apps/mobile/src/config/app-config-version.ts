export type AppConfigVersion = {
  version: string;
  versionCode: number | null;
};

export function readAppVersionFromConfigSource(source: string): AppConfigVersion {
  const version = source.match(/^\s*version:\s*'([^']+)'/m)?.[1];
  const versionCodeRaw = source.match(/^\s*versionCode:\s*(\d+)/m)?.[1];
  if (!version) {
    throw new Error('app_config_version_missing');
  }
  return {
    version,
    versionCode: versionCodeRaw ? Number(versionCodeRaw) : null,
  };
}
