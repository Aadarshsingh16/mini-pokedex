import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { RadarComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { Pokemon } from '../../models/pokemon.model';

echarts.use([RadarChart, RadarComponent, TooltipComponent, CanvasRenderer]);

/**
 * Radar chart component rendering the 6 base stats of a Pokémon.
 * Uses local ECharts providers and animates updates via [merge].
 */
@Component({
  selector: 'app-pokemon-radar-chart',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './pokemon-radar-chart.component.html',
  styleUrl: './pokemon-radar-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonRadarChartComponent {
  /** 6 base stats */
  public readonly stats = input.required<Pokemon['stats']>();

  /** Name of the Pokémon for chart series label */
  public readonly pokemonName = input<string>('Base Stats');

  /**
   * Computed ECharts options with fixed radial axis max of 255.
   */
  public readonly chartOptions = computed<EChartsOption>(() => {
    const s = this.stats();
    const name = this.pokemonName();

    return {
      tooltip: {
        trigger: 'item',
      },
      radar: {
        indicator: [
          { name: 'HP', max: 255 },
          { name: 'Attack', max: 255 },
          { name: 'Defense', max: 255 },
          { name: 'Sp. Atk', max: 255 },
          { name: 'Sp. Def', max: 255 },
          { name: 'Speed', max: 255 },
        ],
        shape: 'polygon',
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(248, 250, 252, 0.5)', 'rgba(241, 245, 249, 0.9)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: '#cbd5e1',
          },
        },
        splitLine: {
          lineStyle: {
            color: '#e2e8f0',
          },
        },
        axisName: {
          color: '#475569',
          fontWeight: 'bold',
          fontSize: 11,
        },
      },
      series: [
        {
          name,
          type: 'radar',
          data: [
            {
              value: [
                s.hp,
                s.attack,
                s.defense,
                s.specialAttack,
                s.specialDefense,
                s.speed,
              ],
              name,
              areaStyle: {
                color: 'rgba(59, 130, 246, 0.3)',
              },
              lineStyle: {
                color: '#2563eb',
                width: 2,
              },
              itemStyle: {
                color: '#1d4ed8',
              },
            },
          ],
          animationDuration: 500,
          animationEasing: 'cubicOut',
        },
      ],
    };
  });
}
