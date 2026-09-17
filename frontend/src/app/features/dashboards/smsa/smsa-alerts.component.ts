import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle, lucideCheck, lucideShieldAlert, lucideMapPin } from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-smsa-alerts',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideAlertTriangle, lucideCheck, lucideShieldAlert, lucideMapPin 
})],
  template: `
    <div class="smsa-alerts zir-animate-in">
      <header class="page-header">
        <h2>Alertes Phytosanitaires</h2>
        <p>Gérez les détections de maladies sur les parcelles de vos membres.</p>
      </header>

      <div class="zir-card" style="padding: 24px;">
        @if (isLoading()) {
          <div style="display:flex; flex-direction:column; gap:16px;">
            @for (_ of [1,2,3]; track $index) {
              <div class="zir-skeleton--text" style="height:80px; border-radius:8px;"></div>
            }
          </div>
        } @else if (detections().length > 0) {
          <div class="alerts-grid">
            @for (d of detections(); track d.id) {
              <div class="zir-card alert-card">
                <div class="alert-header">
                  <div class="alert-title">
                    <ng-icon name="lucideAlertTriangle" style="color:var(--error);"></ng-icon>
                    <h3>{{ d.disease_name || 'Maladie suspectée' }}</h3>
                  </div>
                  <span class="zir-badge" [ngClass]="d.status === 'VALIDATED' ? 'zir-badge--success' : 'zir-badge--warning'">
                    {{ d.status }}
                  </span>
                </div>
                <div class="alert-body">
                  <p><ng-icon name="lucideMapPin"></ng-icon> Agriculteur : {{ d.parcel?.owner?.name || 'Inconnu' }}</p>
                  <p>Confiance IA : {{ (d.confidence_score * 100) | number:'1.0-0' }}%</p>
                  <p>Date : {{ d.created_at | date:'dd MMM yyyy HH:mm' }}</p>
                </div>
                <div class="alert-footer">
                  @if (d.status === 'PENDING') {
                    <button class="zir-btn zir-btn--primary" (click)="validateAlert(d.id)" style="width:100%; justify-content:center;">
                      <ng-icon name="lucideCheck"></ng-icon> Valider & Alerter la région
                    </button>
                  } @else {
                    <div style="text-align:center; color:var(--zir-emerald); font-size:14px; font-weight:600;">
                      <ng-icon name="lucideShieldAlert"></ng-icon> Alerte régionale activée
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="zir-empty">
            <div class="zir-empty__icon"><ng-icon name="lucideLeaf"></ng-icon></div>
            <div class="zir-empty__desc">Aucune détection signalée dans votre coopérative.</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .smsa-alerts { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; }
    .page-header p { color: var(--text-secondary); }
    .alerts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .alert-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .alert-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .alert-title { display: flex; align-items: center; gap: 8px; }
    .alert-title h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .alert-body p { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .alert-footer { margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 16px; }
  `]
})
export class SmsaAlertsComponent implements OnInit {
  private http = inject(HttpClient);
  private notificationStore = inject(NotificationStore);

  detections = signal<any[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.loadDetections();
  }

  loadDetections() {
    this.isLoading.set(true);
    // Supposons que l'API de base ait un scope group pour les admins
    this.http.get<any[]>(`${environment.apiUrl}/disease-detections`).subscribe({
      next: (data) => {
        this.detections.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  validateAlert(id: string) {
    this.http.patch(`${environment.apiUrl}/disease-detections/${id}/validate`, {}).subscribe({
      next: () => {
        this.notificationStore.showSuccess('Alerte validée ! Les agriculteurs voisins seront notifiés.');
        this.loadDetections();
      },
      error: () => {
        this.notificationStore.showError('Erreur lors de la validation.');
      }
    });
  }
}
