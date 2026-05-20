import { eq } from "drizzle-orm";
import { AppInstance } from "../../global";
import * as schema from "../../schema";

export default async function userRoutes(fs: AppInstance) {
  fs.get(
    "/profile",
    {
      preHandler: fs.authenticate,
    },
    async (request, reply) => {
      const { sub } = request.user;

      const [user] = await fs.db
        .select({ email: schema.users.email, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, sub))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ message: "User not found" });
      }

      reply.send({ user });
    },
  );
}
