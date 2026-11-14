import type { RequestHandler } from "express";
import type { TokenService } from "../../services/token-service.js";

/**
 * Enriches public requests with the current user when a valid bearer token is
 * present. An expired token must not prevent a visitor from reading public
 * content, so invalid credentials are treated as an anonymous request here.
 */
export function optionalAuthenticate(tokenService: TokenService): RequestHandler {
  return async (request, _response, next) => {
    const authorization = request.header("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      next();
      return;
    }
    try {
      request.auth = await tokenService.verifyAccessToken(authorization.slice(7));
    } catch {
      // Public resources remain available without a valid session.
    }
    next();
  };
}
