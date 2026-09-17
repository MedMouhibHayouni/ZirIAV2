import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideTrendingUp, lucideUsers, lucidePackageCheck } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

Chart.register(...registerables);

@Component({
  selector: 'app-supplier-analytics',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideTrendingUp, lucideUsers, lucidePackageCheck })],
  templateUrl: './supplier-analytics.component.html',
  styleUrls: ['./supplier-analytics.component.scss']
})
export class SupplierAnalyticsComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  
  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('statusChart') statusChartRef!: ElementRef;

  analytics: any = null;
  loading = true;
  error: string | null = null;
  isAdvanced = false;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/supplier/analytics/advanced`).subscribe({
      next: (res) => {
        this.analytics = res;
        this.isAdvanced = true;
        this.loading = false;
        setTimeout(() => this.renderCharts(), 100);
      },
      error: () => {
        // Fallback to basic
        this.http.get<any>(`${environment.apiUrl}/supplier/analytics/basic`).subscribe({
          next: (res) => {
            this.analytics = res;
            this.isAdvanced = false;
            this.loading = false;
            setTimeout(() => this.renderCharts(), 100);
          },
          error: (err) => {
            this.error = err.error?.message || 'Accès refusé.';
            this.loading = false;
          }
        });
      }
    });
  }

  ngAfterViewInit() {}

  renderCharts() {
    if (!this.analytics) return;

    // Revenue Line Chart
    if (this.revenueChartRef) {
      new Chart(this.revenueChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: this.analytics.revenueLast6Months.map((d: any) => d.month),
          datasets: [{
            label: 'Chiffre d\'Affaires (TND)',
            data: this.analytics.revenueLast6Months.map((d: any) => d.revenue),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          }
        }
      });
    }

    // Status Doughnut Chart
    if (this.statusChartRef) {
      const statusData = this.analytics.ordersByStatus || {};
      const labels = Object.keys(statusData);
      const data = Object.values(statusData);

      new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#6B7280'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9ca3af' } }
          },
          cutout: '75%'
        }
      });
    }
  }
}
