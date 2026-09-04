import { isWellFormedSessionToken } from '../../infrastructure/security/session-token-service';

/** Parse one unambiguous RFC 6750 bearer credential. */
export function readBearerToken(authorization: string | undefined): string | null {
  if (authorization === undefined) {
    return null;
  }

  const match = /^Bearer ([^\s,]+)$/i.exec(authorization);
  const token = match?.[1];
  return token !== undefined && isWellFormedSessionToken(token) ? token : null;
}
