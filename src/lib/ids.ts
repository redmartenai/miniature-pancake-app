import * as Crypto from 'expo-crypto';

/** Client-generated id so a retried request is recognised by the server (no duplicates). */
export function newClientId(): string {
  return Crypto.randomUUID();
}
