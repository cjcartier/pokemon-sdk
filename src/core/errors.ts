export class SDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class HTTPError extends SDKError {
  constructor(public status: number, public url: string, public method: string, public bodySnippet?: string) {
    super(`${method} ${url} → ${status}${bodySnippet ? `: ${bodySnippet}` : ''}`);
  }
}

export class NetworkError extends SDKError {
  constructor(public cause: unknown) {
    super(`Network error: ${String(cause)}`);
  }
}

export class ValidationError extends SDKError {
  constructor(public issues: unknown) {
    super('Response validation failed');
  }
}
