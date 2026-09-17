import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle, lucideAlertCircle, lucideCheckCircle, lucideLoader, lucideFlag, lucideX, lucideBell } from '@ng-icons/lucide';
import { AmbassadorApiService, ZoneAlert } from '../../../core/services/ambassador-api.service';

@Component({
  selector: 'app-amb-alerts',
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideAlertTriangle, lucideAlertCircle, lucideCheckCircle, lucideLoader, lucideFlag, lucideX, lucideBell })],
  template: `
<div class="alerts-page">
  <div class="page-header"><h2 class="page-title"><ng-icon name="lucideBell"></ng-icon> Alertes Zone</h2></div>
  @if (isLoading()) { <div class="loading"><ng-icon name="lucideLoader" class="spin"></ng-icon> Chargement...</div> }
  <div class="alerts-layout">
    <div class="alert-list">
      @for (a of alerts(); track a.id) {
        <div class="alert-row" [class.selected]="selected()?.id===a.id" [class]="'sev-' + a.severity.toLowerCase()" (click)="selected.set(a)">
          <div class="sev-bar"></div>
          <div class="alert-body">
            <div class="alert-disease">{{ a.disease_name }}</div>
            <div class="alert-meta">{{ a.farmer_display_name }} · {{ a.crop_type }}</div>
          </div>
          <div class="alert-date">{{ a.detected_at | date:'dd/MM HH:mm' }}</div>
        </div>
      }
      @if (!alerts().length && !isLoading()) { <div class="empty">Aucune alerte active</div> }
    </div>
    <div class="alert-detail">
      @if (selected(); as a) {
        <div class="detail-card">
          <div class="detail-header sev-{{ a.severity.toLowerCase() }}">
            <ng-icon [name]="a.severity==='CRITICAL' ? 'lucideAlertCircle' : 'lucideAlertTriangle'"></ng-icon>
            <span class="detail-disease">{{ a.disease_name }}</span>
            <span class="sev-badge">{{ a.severity }}</span>
          </div>
          <div class="detail-body">
            <div class="detail-row"><strong>Agriculteur</strong><span>{{ a.farmer_display_name }}</span></div>
            <div class="detail-row"><strong>Parcelle</strong><span>{{ a.parcel_name }}</span></div>
            <div class="detail-row"><strong>Culture</strong><span>{{ a.crop_type }}</span></div>
            <div class="detail-row"><strong>Confiance IA</strong><span>{{ (a.confidence_score * 100).toFixed(0) }}%</span></div>
            <div class="detail-row"><strong>Détecté le</strong><span>{{ a.detected_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
            @if (a.photo_url) { <img [src]="a.photo_url" class="detail-photo" alt="Photo diagnostic"> }
          </div>
          <div class="detail-actions">
            <button class="action-btn primary"><ng-icon name="lucideFlag"></ng-icon> Signaler à l'Expert</button>
            <button class="action-btn secondary"><ng-icon name="lucideBell"></ng-icon> Notifier l'agriculteur</button>
          </div>
        </div>
      } @else {
        <div class="empty-detail"><ng-icon name="lucideAlertTriangle"></ng-icon><p>Sélectionnez une alerte pour voir les détails</p></div>
      }
    </div>
  </div>
</div>`,
  styles: [`
.alerts-page{padding:24px;} .page-title{font-size:1.875rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:12px;margin-bottom:24px;ng-icon{color:#ef4444;}}
.loading{display:flex;align-items:center;gap:12px;padding:40px;color:#64748b;justify-content:center;} .spin{animation:spin 1s linear infinite;} @keyframes spin{100%{transform:rotate(360deg);}}
.alerts-layout{display:grid;grid-template-columns:1fr 1fr;gap:24px;height:calc(100vh - 200px);}
.alert-list{background:white;border-radius:16px;overflow-y:auto;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
.alert-row{display:flex;align-items:center;padding:16px;cursor:pointer;transition:background 0.15s;border-bottom:1px solid #f1f5f9;gap:16px;
  &.selected{background:#f0fdf4;} &:hover{background:#f8fafc;}
  &.sev-critical .sev-bar{background:#ef4444;width:4px;height:40px;border-radius:2px;flex-shrink:0;}
  &.sev-warning .sev-bar{background:#f59e0b;width:4px;height:40px;border-radius:2px;flex-shrink:0;}
  &.sev-normal .sev-bar{background:#10b981;width:4px;height:40px;border-radius:2px;flex-shrink:0;}
}
.alert-body{flex:1;} .alert-disease{font-weight:700;color:#0f172a;} .alert-meta{font-size:0.8rem;color:#64748b;margin-top:2px;} .alert-date{font-size:0.75rem;color:#94a3b8;}
.empty{padding:40px;text-align:center;color:#94a3b8;font-style:italic;}
.alert-detail{background:white;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;}
.detail-card{height:100%;display:flex;flex-direction:column;}
.detail-header{padding:24px;display:flex;align-items:center;gap:16px;font-size:22px;
  &.sev-critical{background:#fee2e2;color:#dc2626;} &.sev-warning{background:#fef3c7;color:#d97706;} &.sev-normal{background:#dcfce7;color:#16a34a;}
}
.detail-disease{font-size:1.25rem;font-weight:700;flex:1;} .sev-badge{padding:4px 12px;border-radius:20px;background:rgba(0,0,0,0.1);font-size:0.75rem;font-weight:700;text-transform:uppercase;}
.detail-body{padding:24px;flex:1;display:flex;flex-direction:column;gap:16px;}
.detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;strong{color:#64748b;font-weight:500;}span{color:#0f172a;font-weight:600;}}
.detail-photo{width:100%;height:200px;object-fit:cover;border-radius:12px;}
.detail-actions{padding:24px;border-top:1px solid #f1f5f9;display:flex;gap:12px;}
.action-btn{display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:10px;font-weight:600;cursor:pointer;border:none;transition:all 0.2s;
  &.primary{background:linear-gradient(135deg,#10b981,#059669);color:white;box-shadow:0 4px 12px rgba(16,185,129,0.3);}
  &.secondary{background:#f1f5f9;color:#475569;&:hover{background:#e2e8f0;}}
}
.empty-detail{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;ng-icon{font-size:48px;margin-bottom:16px;color:#cbd5e1;}p{font-size:1rem;}}
`]
})
export class AmbAlertsComponent implements OnInit {
  private readonly api = inject(AmbassadorApiService);
  alerts = signal<ZoneAlert[]>([]);
  isLoading = signal(true);
  selected = signal<ZoneAlert | null>(null);
  ngOnInit() { this.api.getZoneAlerts().subscribe(a => { this.alerts.set(a); this.isLoading.set(false); }); }
}
