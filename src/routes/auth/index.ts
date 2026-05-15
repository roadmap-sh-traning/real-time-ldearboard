import { loginSchema, loginResponseSchema } from "../../schemas/login.schema";
import { AuthService } from "../../feature/auth/services/auth.service";
import { AuthRepository } from "../../feature/auth/repositories/auth.repository";
import { AppInstance } from "../../global";

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
}
