export type PickedProfileImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export function toUploadPayload(image: PickedProfileImage) {
  return {
    uri: image.uri,
    type: image.mimeType,
    name: image.fileName,
  };
}
