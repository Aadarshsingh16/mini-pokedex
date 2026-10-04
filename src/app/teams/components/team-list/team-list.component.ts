import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Team } from '../../models/team.model';
import { DerivedAsyncStatus } from '../../../common/models/async-state.model';
import { TeamCardComponent } from '../team-card/team-card.component';
import { UiStateComponent } from '../../../common/components/ui-state/ui-state.component';

/**
 * 4-state team list component managing team cards, selection,
 * and optimistic action propagation.
 */
@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, TeamCardComponent, UiStateComponent],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamListComponent {
  /** Array of teams to display */
  public readonly teams = input<Team[]>([]);

  /** 4-state async view status */
  public readonly status = input.required<DerivedAsyncStatus>();

  /** Error message if query failed */
  public readonly errorMessage = input<string | null>(null);

  /** Currently selected team ID */
  public readonly selectedTeamId = input<string | null>(null);

  /** IDs of teams pending optimistic server creation */
  public readonly pendingCreationIds = input<string[]>([]);

  /** IDs of teams pending optimistic server deletion */
  public readonly pendingDeletionIds = input<string[]>([]);

  /** Emits when a team is selected */
  public readonly selectTeam = output<string>();

  /** Emits when a team deletion is triggered */
  public readonly deleteTeam = output<string>();

  /** Emits retry action when team query failed */
  public readonly retry = output<void>();

  public onSelectTeam(id: string): void {
    this.selectTeam.emit(id);
  }

  public onDeleteTeam(id: string): void {
    this.deleteTeam.emit(id);
  }

  public onRetry(): void {
    this.retry.emit();
  }
}
