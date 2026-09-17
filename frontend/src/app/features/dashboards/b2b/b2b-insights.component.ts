import {  Component, OnInit, AfterViewInit, ElementRef, ViewChild, inject, effect, PLATFORM_ID , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideTrendingUp, lucideTrendingDown, lucideAlertTriangle, lucideBarChart2 } from '@ng-icons/lucide';
import { Chart, registerables } from 'chart.js';
import { MarketPricesService } from '../../../core/services/market-prices.service';
Chart.register(...registerables);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-b2b-insights',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideTrendingUp, lucideTrendingDown, lucideAlertTriangle, lucideBarChart2 
})],
  templateUrl: './b2b-insights.component.html',
  styleUrl: './b2b-insights.component.scss'
})
export class B2bInsightsComponent implements OnInit, AfterViewInit {
  @ViewChild('trendsChart', { static: false }) trendsChart!: ElementRef<HTMLCanvasElement>;

  private marketService = inject(MarketPricesService);
  private platformId = inject(PLATFORM_ID);

  readonly prices = this.marketService.prices;
  readonly trends = this.marketService.trends;
  readonly isLoading = this.marketService.isLoading;
  readonly hasError = this.marketService.hasError;

  private chart!: Chart;

  constructor() {
    effect(() => {
      if (this.trends().length > 0 && isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.initChart(), 100);
      }
    });
  }

  ngOnInit() {
    this.marketService.fetchDailyPrices();
    this.marketService.fetchTrends();
  }

  ngAfterViewInit() {
    // Chart init is handled in effect when data is ready
  }

  initChart() {
    if (!this.trendsChart?.nativeElement) return;
    
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.trendsChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    // We assume all trends have the same dates array length and values
    const labels = this.trends()[0]?.dates || Array.from({length: 30}, (_, i) => `Jour ${i+1}`);

    const datasets = this.trends().map((t, index) => ({
      label: t.crop_type,
      data: t.prices,
      borderColor: colors[index % colors.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 0,
      pointHitRadius: 10
    }));

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#64748b', font: { family: 'Outfit', size: 12 } }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { family: 'Outfit' },
            bodyFont: { family: 'Outfit' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
          }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
      }
    });
  }
}
