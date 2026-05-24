export interface NameResolverPort {
  resolveMany(userIds: number[]): Promise<Map<number, string>>;
}
