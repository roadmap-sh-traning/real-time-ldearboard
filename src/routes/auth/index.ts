import { AuthService } from "../../feature/auth/services/auth.service";
import { AuthRepository } from "../../feature/auth/repositories/auth.repository";
import { AppInstance } from "../../global";
import {
  loginResponseSchema,
  loginSchema,
  registerShema,
  registerResponseSchema,
  RefreshTokenSchema,
} from "../../schemas";

export default async function userRoutes(fs: AppInstance) {
  const authRepository = new AuthRepository(fs.db);
  const authService = new AuthService(authRepository, fs);

  fs.post(
    "/login",
    {
      schema: {
        body: loginSchema,
        response: {
          200: loginResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const { accessToken, refreshToken } = await authService.login(
        email,
        password,
      );

      reply.send({ accessToken, refreshToken });
    },
  );

  fs.post(
    "/register",
    {
      schema: {
        body: registerShema,
        response: {
          200: registerResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;

      const { accessToken, refreshToken } = await authService.register(
        name,
        email,
        password,
      );

      reply.send({ accessToken, refreshToken });
    },
  );

  fs.post(
    "/refresh-token",
    {
      schema: {
        body: RefreshTokenSchema,
        response: {
          200: registerResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      const token = await authService.refreshToken(refreshToken);

      reply.send({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      });
    },
  );
}
