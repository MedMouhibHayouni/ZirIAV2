import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideBellRing, lucideMapPin, lucideCalendar, lucideSend, lucideShieldAlert, lucideActivity } from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  selector: 'app-exp-alerts',
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideBellRing, lucideMapPin, lucideCalendar, lucideSend, lucideShieldAlert, lucideActivity })],
  template: `
<div class="alerts-wrap">
  <div class="layout-grid">
    
    <!-- LEFT: List of Broadcasted Alerts -->
    <div class="alerts-list-card">
      <div class="card-header">
        <h2><ng-icon name="lucideBellRing"></ng-icon> Historique des Alertes</h2>
      </div>
      <div class="list-content">
        @for (a of alerts(); track a.id) {
          <div class="alert-item">
            <div class="alert-icon"><ng-icon name="lucideShieldAlert"></ng-icon></div>
            <div class="alert-details">
              <div class="alert-title">{{ a.disease_name }}</div>
              <div class="alert-meta">
                <span><ng-icon name="lucideCalendar"></ng-icon> {{ a.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                <span class="impact-badge"><ng-icon name="lucideActivity"></ng-icon> {{ a.impacted_farmers_count }} notifiés</span>
              </div>
              <p class="alert-msg">{{ a.message }}</p>
            </div>
          </div>
        }
        @if (!alerts().length) {
          <div class="empty">Aucune alerte diffusée pour l'instant.</div>
        }
      </div>
    </div>

    <!-- RIGHT: Form to broadcast new alert -->
    <div class="broadcast-card">
      <div class="card-header">
        <h2><ng-icon name="lucideSend"></ng-icon> Diffuser une Nouvelle Alerte</h2>
        <p>Avertir les agriculteurs dans un rayon défini autour d'un point focal d'infection.</p>
      </div>
      <div class="broadcast-form">
        <div class="form-group">
          <label>Maladie / Menace</label>
          <input type="text" [(ngModel)]="form.diseaseName" placeholder="Ex: Mildiou de la tomate..." class="form-input">
        </div>

        <div class="form-group">
          <label>Gouvernorat cible</label>
          <select class="form-input" (change)="onGovChange($any($event.target).value)">
            <option value="">Sélectionner un gouvernorat...</option>
            <option *ngFor="let g of centroids()" [value]="g.name_fr">{{ g.name_fr }}</option>
          </select>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Latitude</label>
            <input type="number" [(ngModel)]="form.lat" placeholder="Ex: 35.23" class="form-input">
          </div>
          <div class="form-group">
            <label>Longitude</label>
            <input type="number" [(ngModel)]="form.lng" placeholder="Ex: 9.12" class="form-input">
          </div>
        </div>

        <div class="form-group">
          <label>Rayon d'action (Km) : {{ form.radiusKm }} km</label>
          <input type="range" min="1" max="50" [(ngModel)]="form.radiusKm" class="range-slider">
        </div>

        <div class="form-group">
          <label>Message aux agriculteurs</label>
          <textarea [(ngModel)]="form.message" rows="4" placeholder="Instructions préventives..." class="form-input"></textarea>
        </div>

        <button class="btn-broadcast" (click)="submitBroadcast()" [disabled]="!form.diseaseName || !form.message">
          <ng-icon name="lucideSend"></ng-icon> Diffuser l'Alerte Régionale
        </button>
      </div>
    </div>

  </div>
</div>
`,
  styles: [`
.alerts-wrap { padding: 32px; max-width: 1200px; margin: 0 auto; }
.layout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }

.alerts-list-card, .broadcast-card { background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); overflow: hidden; border: 1px solid var(--border); }
.card-header { padding: 24px; border-bottom: 1px solid var(--border); background: var(--bg-secondary); }
.card-header h2 { margin: 0; font-size: 1.25rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.card-header h2 ng-icon { color: var(--warning); }
.card-header p { margin: 8px 0 0 0; color: var(--text-muted); font-size: 0.9rem; }

.list-content { padding: 16px; max-height: 600px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.alert-item { display: flex; gap: 16px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-card); transition: all 0.2s; }
.alert-item:hover { border-color: var(--border-accent); box-shadow: var(--shadow-sm); }

.alert-icon { width: 40px; height: 40px; background: var(--warning-bg); color: var(--warning); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.alert-title { font-weight: 700; color: var(--text-primary); font-size: 1rem; margin-bottom: 4px; }
.alert-meta { display: flex; gap: 16px; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }
.alert-meta span { display: flex; align-items: center; gap: 4px; }
.impact-badge { background: var(--error-bg); color: var(--error); padding: 2px 8px; border-radius: 12px; font-weight: 600; }
.alert-msg { margin: 0; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; }
.empty { padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }

.broadcast-form { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.form-input { padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); font-family: inherit; font-size: 0.95rem; outline: none; transition: border-color 0.2s; }
.form-input:focus { border-color: var(--warning); box-shadow: 0 0 0 3px var(--warning-dim); }
.range-slider { width: 100%; accent-color: var(--warning); }

.btn-broadcast { background: var(--warning); color: white; border: none; padding: 14px; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; margin-top: 12px; }
.btn-broadcast:hover:not(:disabled) { background: var(--warning-dark); filter: brightness(1.1); }
.btn-broadcast:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ExpAlertsComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly notifs = inject(NotificationStore);

  alerts = signal<any[]>([]);
  centroids = signal<any[]>([]);
  
  form = {
    diseaseName: '',
    lat: 35.23,
    lng: 9.12,
    radiusKm: 15,
    message: ''
  };

  ngOnInit() {
    this.loadAlerts();
    this.api.getGovernorateCentroids().subscribe(res => this.centroids.set(res));
  }

  loadAlerts() {
    this.api.getMyAlerts?.()?.subscribe(res => this.alerts.set(res));
  }

  onGovChange(govName: string) {
    const found = this.centroids().find(c => c.name_fr === govName);
    if (found) {
      this.form.lat = parseFloat(found.lat);
      this.form.lng = parseFloat(found.lng);
    }
  }

  submitBroadcast() {
    this.api.broadcastAlert?.(this.form).subscribe({
      next: (res: any) => {
        this.notifs.showSuccess(`Alerte diffusée à ${res.alerted_farmers_count} agriculteurs.`);
        this.form.message = '';
        this.form.diseaseName = '';
        this.loadAlerts();
      },
      error: () => this.notifs.showError('Erreur lors de la diffusion de l\'alerte')
    });
  }
}
