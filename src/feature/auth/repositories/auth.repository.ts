import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../schema";
import { eq } from "drizzle-orm";

export class AuthRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async findUserByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
  }

  async findRefreshToken(userId: number) {
    return this.db.query.refreshTokens.findFirst({
      where: eq(schema.refreshTokens.userId, userId),
    });
  }

  async createUser(email: string, password: string, name: string) {
    return this.db.insert(schema.users).values({
      email,
      password,
      name,
    });
  }

  async createRefreshToken(data: {
    userId: number;
    expiresAt: Date;
    token: string;
    jti: string;
  }) {
    return this.db.insert(schema.refreshTokens).values(data);
  }
}
