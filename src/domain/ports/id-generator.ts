export interface IdGenerator {
  generate(): string;
}

export function createCryptoIdGenerator(): IdGenerator {
  return {
    generate: () => crypto.randomUUID(),
  };
}
