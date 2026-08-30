declare const process: {
  env: Record<string, string | undefined>;
};

declare module 'node:http' {
  export interface IncomingMessage {}
  export interface ServerResponse {
    setHeader(name: string, value: string): void;
    end(data?: string): void;
  }

  export function createServer(
    handler: (request: IncomingMessage, response: ServerResponse) => void,
  ): {
    listen(port: number, callback?: () => void): void;
  };
}

declare module 'node:assert/strict' {
  interface Assert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    throws(block: () => void, expected?: RegExp, message?: string): void;
  }

  const assert: Assert;
  export default assert;
}

declare module 'node:test' {
  export default function test(name: string, fn: () => void | Promise<void>): void;
}
