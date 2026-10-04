/**
 * Standard GraphQL request payload with operation query and variables.
 */
export interface GraphqlRequest<TVariables = Record<string, unknown>> {
  query: string;
  variables?: TVariables;
}

/**
 * Standard GraphQL error object returned by GraphQL endpoints.
 */
export interface GraphqlErrorItem {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
}

/**
 * Standard GraphQL response envelope.
 */
export interface GraphqlResponse<TData> {
  data?: TData;
  errors?: GraphqlErrorItem[];
}

/**
 * Custom error class wrapping GraphQL and HTTP failures with a user-facing message.
 */
export class GraphqlRequestError extends Error {
  public readonly userMessage: string;
  public override readonly cause?: unknown;

  constructor(userMessage: string, technicalMessage?: string, cause?: unknown) {
    super(technicalMessage ?? userMessage);
    this.name = 'GraphqlRequestError';
    this.userMessage = userMessage;
    this.cause = cause;
    Object.setPrototypeOf(this, GraphqlRequestError.prototype);
  }
}
