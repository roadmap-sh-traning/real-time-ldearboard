import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../schema";
import { eq } from "drizzle-orm";
import { Tx } from "../../../shared/types/transaction.type";

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

  async findRefreshTokenByJti(jti: string) {
    return this.db.query.refreshTokens.findFirst({
      where: eq(schema.refreshTokens.jti, jti),
    });
  }

  async createUser(email: string, password: string, name: string) {
    return this.db
      .insert(schema.users)
      .values({
        email,
        password,
        name,
      })
      .returning();
  }

  async deleteRefreshToken(jti: string, tx?: Tx) {
    return (tx || this.db)
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.jti, jti))
      .returning();
  }

  async deleteAllRefreshTokens(userId: number, tx?: Tx) {
    return (tx || this.db)
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.userId, userId))
      .returning();
  }

  async createRefreshToken(data: {
    userId: number;
    expiresAt: Date;
    token: string;
    jti: string;
    tx?: Tx;
  }) {
    return (data.tx || this.db)
      .insert(schema.refreshTokens)
      .values(data)
      .returning();
  }
}
