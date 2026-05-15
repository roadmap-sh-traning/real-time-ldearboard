import { FastifyInstance } from "fastify";
import { AUTH_ERROR } from "../../../custom-errors/auth";
import { AuthRepository } from "../repositories/auth.repository";
import { BuildTokenBody } from "../../../schemas/build-token.schema";
import { randomUUID } from "crypto";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private fastify: FastifyInstance,
  ) {}

  async login(email: string, password: string) {
    const user = await this.authRepository.findUserByEmail(email);

    if (!user) {
      throw AUTH_ERROR.EMAIL_ALREADY_EXISTS;
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
  ) {
    return this.authRepository.createRefreshToken({
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      token: hashedRefreshToken,
      jti,
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
