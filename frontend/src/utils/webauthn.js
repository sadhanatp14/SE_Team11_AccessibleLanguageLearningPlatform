const toBase64Url = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const isWebAuthnSupported = () => (
  typeof window !== 'undefined'
  && !!window.PublicKeyCredential
  && !!navigator.credentials
  && typeof navigator.credentials.create === 'function'
  && typeof navigator.credentials.get === 'function'
);

export const prepareCreationOptions = (publicKey) => ({
  ...publicKey,
  challenge: fromBase64Url(publicKey.challenge),
  user: {
    ...publicKey.user,
    id: fromBase64Url(publicKey.user.id),
  },
  excludeCredentials: (publicKey.excludeCredentials || []).map((cred) => ({
    ...cred,
    id: fromBase64Url(cred.id),
  })),
});

export const prepareRequestOptions = (publicKey) => ({
  ...publicKey,
  challenge: fromBase64Url(publicKey.challenge),
  allowCredentials: (publicKey.allowCredentials || []).map((cred) => ({
    ...cred,
    id: fromBase64Url(cred.id),
  })),
});

export const serializeRegistrationCredential = (credential) => ({
  id: credential.id,
  type: credential.type,
  rawId: toBase64Url(credential.rawId),
  response: {
    clientDataJSON: toBase64Url(credential.response.clientDataJSON),
    attestationObject: toBase64Url(credential.response.attestationObject),
    transports: typeof credential.response.getTransports === 'function'
      ? credential.response.getTransports()
      : [],
  },
});

export const serializeLoginCredential = (credential) => ({
  id: credential.id,
  type: credential.type,
  rawId: toBase64Url(credential.rawId),
  response: {
    clientDataJSON: toBase64Url(credential.response.clientDataJSON),
    authenticatorData: toBase64Url(credential.response.authenticatorData),
    signature: toBase64Url(credential.response.signature),
    userHandle: credential.response.userHandle ? toBase64Url(credential.response.userHandle) : null,
  },
});
