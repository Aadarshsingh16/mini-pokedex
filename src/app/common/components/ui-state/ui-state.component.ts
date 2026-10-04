import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DerivedAsyncStatus } from '../../models/async-state.model';

/**
 * Reusable UI state wrapper handling loading skeleton, empty state,
 * error state with retry button, and success state projection.
 */
@Component({
  selector: 'app-ui-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-state.component.html',
  styleUrl: './ui-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiStateComponent {
  /** The current async state status */
  public readonly status = input.required<DerivedAsyncStatus>();

  /** Error message to display when status is 'error' */
  public readonly errorMessage = input<string | null>('Unable to load data. Please try again.');

  /** Empty message to display when status is 'empty' */
  public readonly emptyMessage = input<string>('No records found.');

  /** Height placeholder reserved for loading state to prevent layout shift */
  public readonly skeletonHeight = input<string>('220px');

  /** Number of skeleton row bars when rendered as a list/table */
  public readonly skeletonRows = input<number>(5);

  /** Event emitted when user clicks the Retry button */
  public readonly retry = output<void>();

  /**
   * Helper generating array of indexes for skeleton row tracking.
   */
  public get skeletonRowArray(): number[] {
    return Array.from({ length: this.skeletonRows() }, (_, i) => i);
  }

  /**
   * Handles retry button click.
   */
  public onRetry(): void {
    this.retry.emit();
  }
}
