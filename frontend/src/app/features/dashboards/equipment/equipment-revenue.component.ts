import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideWallet, lucideTrendingUp, lucideBarChart3, 
  lucideArrowUpRight, lucideCalendar, lucideDownload 
} from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-equipment-revenue',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ 
    lucideWallet, lucideTrendingUp, lucideBarChart3, 
    lucideArrowUpRight, lucideCalendar, lucideDownload 
  
})],
  template: `
    <div class="equipment-revenue zir-animate-in">
      
      <header class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 32px;">
        <div>
          <h2 style="display:flex; align-items:center; gap: 12px;">
            <ng-icon name="lucideWallet" style="color:var(--zir-emerald);"></ng-icon>
            Analyse des Revenus
          </h2>
          <p style="color:var(--text-secondary); margin-top: 4px;">Suivi financier et performance de votre parc matériel.</p>
        </div>
        <button class="zir-btn zir-btn--ghost">
          <ng-icon name="lucideDownload"></ng-icon>
          Exporter PDF
        </button>
      </header>

      <div class="stats-overview">
        <div class="zir-card summary-card">
          <div class="card-glow"></div>
          <div class="card-content">
            <div class="label">REVENUS TOTAL (MOIS)</div>
            <div class="amount">
              {{ totalRevenue() | number:'1.0-0' }}
              <span class="currency">TND</span>
            </div>
            <div class="trend up">
              <ng-icon name="lucideTrendingUp"></ng-icon>
              +12.5% par rapport au mois dernier
            </div>
          </div>
        </div>

        <div class="secondary-stats">
          <div class="zir-card mini-stat">
            <div class="mini-label">Missions validées</div>
            <div class="mini-value">24</div>
          </div>
          <div class="zir-card mini-stat">
            <div class="mini-label">Taux d'occupation</div>
            <div class="mini-value">78%</div>
          </div>
        </div>
      </div>

      <div class="charts-grid" style="margin-top: 32px;">
        <div class="zir-card chart-card">
          <div class="chart-header">
            <h3><ng-icon name="lucideBarChart3"></ng-icon> Performance par Machine</h3>
            <div class="period-toggle">Ce mois</div>
          </div>
          
          <div class="machine-stats">
            @for (m of machineStats(); track m.name) {
              <div class="machine-stat-row">
                <div class="machine-info">
                  <span class="machine-name">{{ m.name }}</span>
                  <span class="machine-amount">{{ m.revenue | number:'1.0-0' }} TND</span>
                </div>
                <div class="progress-container">
                  <div class="progress-bar" [style.width.%]="m.percentage"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="zir-card recent-transactions">
          <h3>Flux Financier Récent</h3>
          <div class="tx-list">
            @for (i of [1,2,3]; track i) {
              <div class="tx-item">
                <div class="tx-icon"><ng-icon name="lucideArrowUpRight"></ng-icon></div>
                <div class="tx-info">
                  <div class="tx-title">Location Tracteur JD</div>
                  <div class="tx-date">Aujourd'hui, 14:30</div>
                </div>
                <div class="tx-amount">+85.000</div>
              </div>
            }
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .equipment-revenue {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .stats-overview {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 24px;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .summary-card {
      background: var(--zir-gradient-emerald);
      color: white;
      position: relative;
      overflow: hidden;
      border: none;
      padding: 40px;

      .card-glow {
        position: absolute;
        top: -50%;
        right: -10%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
        border-radius: 50%;
      }

      .card-content {
        position: relative;
        z-index: 1;

        .label {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          opacity: 0.8;
          margin-bottom: 12px;
        }

        .amount {
          font-size: 64px;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 24px;
          
          .currency {
            font-size: 24px;
            font-weight: 600;
            opacity: 0.7;
            margin-left: 8px;
          }
        }

        .trend {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          background: rgba(255,255,255,0.15);
          padding: 8px 16px;
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }
      }
    }

    .secondary-stats {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 24px;

      .mini-stat {
        padding: 24px;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .mini-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .mini-value {
          font-size: 32px;
          font-weight: 800;
          color: var(--text-primary);
        }
      }
    }

    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .chart-card, .recent-transactions {
      padding: 32px;
      
      h3 {
        font-size: 18px;
        font-weight: 800;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-primary);
      }
    }

    .machine-stats {
      display: flex;
      flex-direction: column;
      gap: 24px;

      .machine-stat-row {
        .machine-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          
          .machine-name { font-weight: 700; color: var(--text-primary); }
          .machine-amount { font-weight: 800; color: var(--zir-emerald); }
        }

        .progress-container {
          height: 12px;
          background: var(--zir-bg);
          border-radius: 6px;
          overflow: hidden;

          .progress-bar {
            height: 100%;
            background: var(--zir-gradient-emerald);
            border-radius: 6px;
            transition: width 1s ease-out;
          }
        }
      }
    }

    .tx-list {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .tx-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px;
        border-radius: 12px;
        background: var(--zir-bg);

        .tx-icon {
          width: 40px;
          height: 40px;
          background: rgba(16, 185, 129, 0.1);
          color: var(--zir-emerald);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }

        .tx-info {
          flex: 1;
          .tx-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
          .tx-date { font-size: 12px; color: var(--text-muted); }
        }

        .tx-amount {
          font-weight: 800;
          color: var(--zir-emerald);
        }
      }
    }
  `]
})
export class EquipmentRevenueComponent implements OnInit {
  private http = inject(HttpClient);
  
  totalRevenue = signal(12450);
  machineStats = signal([
    { name: 'John Deere 6120M', revenue: 8400, percentage: 70 },
    { name: 'Moissonneuse Claas', revenue: 4050, percentage: 30 }
  ]);

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/equipment/revenue/summary`).subscribe({
      next: (data) => {
        if (data && data.total_revenue !== undefined) {
           this.totalRevenue.set(data.total_revenue);
        }
        // In real app, we would also set machineStats from data if available
      },
      error: () => {
        // Fallback to mock if API fails
      }
    });
  }
}
