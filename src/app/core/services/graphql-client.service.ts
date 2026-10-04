import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { LoggerService } from '../logger.service';
import { GraphqlRequest, GraphqlRequestError, GraphqlResponse } from '../models/graphql.model';
import { QUERY_RETRY_COUNT, QUERY_RETRY_DELAY_MS } from '../constants/api.constants';

/**
 * Core HTTP GraphQL client service executing typed queries and mutations.
 * Enforces automatic retry policies on queries while keeping mutations non-retriable.
 */
@Injectable({
  providedIn: 'root',
})
export class GraphqlClientService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);

  /**
   * Executes a GraphQL query against the specified URL with configured retry backoff.
   *
   * @template TData Expected shape of the GraphQL `data` envelope
   * @template TVariables Shape of the variables payload passed to the query
   * @param url Target GraphQL endpoint URL
   * @param query GraphQL query string
   * @param variables Optional variables dictionary
   * @returns Observable emitting the unwrapped `data` payload
   */
  public query$<TData, TVariables = Record<string, unknown>>(
    url: string,
    query: string,
    variables?: TVariables
  ): Observable<TData> {
    const payload: GraphqlRequest<TVariables> = { query, variables };

    return this.http.post<GraphqlResponse<TData>>(url, payload).pipe(
      map((response: GraphqlResponse<TData>) => this.extractDataOrThrow(response)),
      retry({
        count: QUERY_RETRY_COUNT,
        delay: QUERY_RETRY_DELAY_MS,
      }),
      catchError((err: unknown) => {
        this.logger.error('GraphqlClientService.query$', err);
        return throwError(() => this.normalizeError(err));
      })
    );
  }

  /**
   * Executes a GraphQL mutation against the specified URL without retry.
   *
   * @template TData Expected shape of the GraphQL `data` envelope
   * @template TVariables Shape of the variables payload passed to the mutation
   * @param url Target GraphQL endpoint URL
   * @param mutation GraphQL mutation string
   * @param variables Optional variables dictionary
   * @returns Observable emitting the unwrapped `data` payload
   */
  public mutate$<TData, TVariables = Record<string, unknown>>(
    url: string,
    mutation: string,
    variables?: TVariables
  ): Observable<TData> {
    const payload: GraphqlRequest<TVariables> = { query: mutation, variables };

    return this.http.post<GraphqlResponse<TData>>(url, payload).pipe(
      map((response: GraphqlResponse<TData>) => this.extractDataOrThrow(response)),
      catchError((err: unknown) => {
        this.logger.error('GraphqlClientService.mutate$', err);
        return throwError(() => this.normalizeError(err));
      })
    );
  }

  /**
   * Validates GraphQL envelope and unwraps the data payload.
   * Throws GraphqlRequestError if GraphQL errors are present or if data is absent.
   */
  private extractDataOrThrow<TData>(response: GraphqlResponse<TData>): TData {
    if (response.errors && response.errors.length > 0) {
      const errorDetails = response.errors.map((e) => e.message).join('; ');
      throw new GraphqlRequestError(
        'Unable to complete request due to a server error. Please try again.',
        `GraphQL error: ${errorDetails}`,
        response.errors
      );
    }

    if (response.data === undefined || response.data === null) {
      throw new GraphqlRequestError(
        'No data received from the server. Please try again.',
        'GraphQL response contained neither data nor explicit errors.'
      );
    }

    return response.data;
  }

  /**
   * Normalizes arbitrary HTTP/runtime errors into a user-friendly GraphqlRequestError.
   */
  private normalizeError(err: unknown): GraphqlRequestError {
    if (err instanceof GraphqlRequestError) {
      return err;
    }

    const technicalMessage = err instanceof Error ? err.message : String(err);
    return new GraphqlRequestError(
      'Unable to connect to the server. Please check your network connection and try again.',
      technicalMessage,
      err
    );
  }
}
