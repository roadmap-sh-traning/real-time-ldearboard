import { FastifyInstance } from "fastify";
import { AUTH_ERROR } from "../../../custom-errors/auth";
import { AuthRepository } from "../repositories/auth.repository";
import { BuildTokenBody } from "../../../schemas/build-token.schema";
import { randomUUID } from "crypto";
import { JwtPayload } from "../../../schemas";
import { Tx } from "../../../shared/types/transaction.type";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private fastify: FastifyInstance,
  ) {}

  async login(email: string, password: string) {
    const user = await this.authRepository.findUserByEmail(email);

    if (!user) {
      throw AUTH_ERROR.EMAIL_OR_PASSWORD;
    }

    const isMatch = await this.fastify.bcrypt.compare(
      password,
      user.password ??
        "$2b$12$invalid.hash.to.keep.timing.stable.aaaaaaaaaaaaaaaaaaaa",
    );

    if (!isMatch) {
      throw AUTH_ERROR.INVALID_PASSWORD;
    }

    return this.issueToken(user.id, user.email);
  }

  async register(name: string, email: string, password: string) {
    const existingUser = await this.authRepository.findUserByEmail(email);

    if (existingUser) {
      throw AUTH_ERROR.EMAIL_ALREADY_EXISTS;
    }

    const hashedPassword = await this.fastify.bcrypt.hash(password);

    const [user] = await this.authRepository.createUser(
      email,
      hashedPassword,
      name,
    );

    if (!user) {
      throw AUTH_ERROR.USER_NOT_FOUND;
    }

    return this.issueToken(user.id, user.email);
  }

  async refreshToken(
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let jwtPayload: JwtPayload;
    try {
      jwtPayload = this.fastify.jwt.verify<JwtPayload>(oldRefreshToken);
    } catch (err) {
      throw AUTH_ERROR.REFRESH_TOKEN_INVALID;
    }

    const refreshTokenRecord = await this.authRepository.findRefreshTokenByJti(
      jwtPayload.jti,
    );

    if (!refreshTokenRecord) {
      throw AUTH_ERROR.REFRESH_TOKEN_EXPIRED;
    }

    if (refreshTokenRecord.expiresAt < new Date()) {
      throw AUTH_ERROR.REFRESH_TOKEN_EXPIRED;
    }

    const isRefreshTokenValid = await this.fastify.bcrypt.compare(
      oldRefreshToken,
      refreshTokenRecord.token,
    );

    if (!isRefreshTokenValid) {
      throw AUTH_ERROR.REFRESH_TOKEN_INVALID;
    }

    const { accessToken, refreshToken, hashedRefreshToken, jti } =
      await this.buildTokens(jwtPayload.sub, jwtPayload.email);

    let reUsed = false;

    await this.fastify.db.transaction(async (tx: Tx) => {
      const deleted = await this.authRepository.deleteRefreshToken(
        jwtPayload.jti,
        tx,
      );

      if (deleted.length === 0) {
        reUsed = true;
        return;
      }

      await this.persistRefreshToken(
        jwtPayload.sub,
        hashedRefreshToken,
        jti,
        tx,
      );
    });

    if (reUsed) {
      await this.authRepository.deleteAllRefreshTokens(jwtPayload.sub);

      throw AUTH_ERROR.REFRESH_TOKEN_REUSED;
    }

    return { accessToken, refreshToken };
  }

  private async issueToken(userId: number, email: string) {
    const { accessToken, refreshToken, hashedRefreshToken, jti } =
      await this.buildTokens(userId, email);

    await this.persistRefreshToken(userId, hashedRefreshToken, jti);

    return { accessToken, refreshToken };
  }

  private persistRefreshToken(
    userId: number,
    hashedRefreshToken: string,
    jti: string,
    tx?: Tx,
  ) {
    return this.authRepository.createRefreshToken({
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      token: hashedRefreshToken,
      jti,
      tx,
    });
  }

  private async buildTokens(
    userId: number,
    email: string,
  ): Promise<BuildTokenBody> {
    const payload = { sub: userId, email };
    const jti = randomUUID();

    const accessToken = this.fastify.jwt.sign(payload);

    const refreshToken = this.fastify.jwt.sign(payload, {
      expiresIn: "7d",
      jti: jti,
    });

    const hashedRefreshToken = await this.fastify.bcrypt.hash(refreshToken);

    return { accessToken, refreshToken, hashedRefreshToken, jti };
  }
}
