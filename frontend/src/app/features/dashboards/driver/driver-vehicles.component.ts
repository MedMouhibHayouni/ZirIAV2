import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideTractor, lucideTruck, lucideSettings, lucideActivity, 
  lucideCalendar, lucideInfo, lucideAlertTriangle, lucideEdit3,
  lucideCheck, lucidePower, lucideMapPin
} from '@ng-icons/lucide';
import { LogisticsApiService, DriverProfile } from '../../../core/services/logistics-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ 
    lucideTractor, lucideTruck, lucideSettings, lucideActivity, 
    lucideCalendar, lucideInfo, lucideAlertTriangle, lucideEdit3,
    lucideCheck, lucidePower, lucideMapPin
  })],
  template: `
    <div class="vehicles-container zir-animate-in">
      <header class="header">
        <h1><ng-icon name="lucideTruck"></ng-icon> Mon Profil & Véhicule</h1>
        <p>Gérez vos informations de transport et votre disponibilité.</p>
      </header>

      @if (isLoading()) {
        <div style="padding: 40px; text-align: center; color: var(--text-muted)">Chargement...</div>
      } @else if (profile()) {
        
        <div class="availability-bar zir-card" [class.is-active]="profile()?.is_available">
          <div class="bar-left">
            <div class="status-indicator"></div>
            <div class="status-text">
              <h3>{{ profile()?.is_available ? 'Vous êtes DISPONIBLE' : 'Vous êtes HORS LIGNE' }}</h3>
              <p>{{ profile()?.is_available ? 'Les agriculteurs peuvent vous envoyer des demandes de transport.' : 'Vous ne recevrez aucune nouvelle demande de transport.' }}</p>
            </div>
          </div>
          <div class="bar-right">
            <button class="zir-btn toggle-btn" 
                    [class.active-btn]="profile()?.is_available"
                    (click)="toggleAvailability()">
              <ng-icon name="lucidePower"></ng-icon>
              {{ profile()?.is_available ? 'Passer Hors Ligne' : 'Passer En Ligne' }}
            </button>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="main-card">
            <div class="truck-display">
               <ng-icon name="lucideTruck" class="bg-icon"></ng-icon>
               <div class="license-plate">
                  {{ profile()?.vehicle_plate || 'NON IMMATRICULÉ' }}
               </div>
               <button class="edit-btn zir-btn zir-btn--ghost" (click)="isEditing.set(true)">
                 <ng-icon name="lucideEdit3"></ng-icon> Modifier
               </button>
            </div>
            
            <div class="card-details">
              @if (!isEditing()) {
                <div class="truck-info">
                  <h2>Véhicule Actuel</h2>
                  <div class="spec-badge">
                    {{ profile()?.vehicle_type }} · {{ profile()?.capacity_tonnes }}T
                  </div>
                  <p class="gov"><ng-icon name="lucideMapPin"></ng-icon> Gouvernorat: {{ profile()?.governorate || 'Non défini' }}</p>
                  <p class="rating mt-4">Note moyenne: <strong>{{ profile()?.rating }} / 5</strong></p>
                </div>
              } @else {
                <div class="edit-form">
                  <h3>Modifier mon véhicule</h3>
                  
                  <div class="zir-form-group">
                    <label>Type de véhicule</label>
                    <select class="zir-input" [(ngModel)]="editForm.vehicle_type">
                      <option value="TRUCK">Camion (Truck)</option>
                      <option value="VAN">Fourgon (Van)</option>
                      <option value="PICKUP">Pickup</option>
                      <option value="REFRIGERATED">Réfrigéré</option>
                    </select>
                  </div>

                  <div class="zir-form-group">
                    <label>Capacité (Tonnes)</label>
                    <input type="number" class="zir-input" [(ngModel)]="editForm.capacity_tonnes">
                  </div>

                  <div class="zir-form-group">
                    <label>Immatriculation</label>
                    <input type="text" class="zir-input" [(ngModel)]="editForm.vehicle_plate">
                  </div>

                  <div class="zir-form-group">
                    <label>Gouvernorat</label>
                    <input type="text" class="zir-input" [(ngModel)]="editForm.governorate">
                  </div>

                  <div style="display:flex; gap: 12px; margin-top: 16px;">
                    <button class="zir-btn zir-btn--primary" (click)="saveProfile()">Enregistrer</button>
                    <button class="zir-btn zir-btn--ghost" (click)="cancelEdit()">Annuler</button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

      } @else {
        <div class="empty-state">
          <p>Impossible de charger le profil.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .vehicles-container { padding: 32px; max-width: 1200px; margin: 0 auto; }
    .header { margin-bottom: 32px; }
    .header h1 { font-size: 32px; font-weight: 850; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 16px; }
    .header h1 ng-icon { color: var(--zir-emerald); }
    .header p { color: var(--text-muted); margin: 8px 0 0; }

    .availability-bar {
      margin-bottom: 32px;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 2px solid var(--border-light);
      transition: all 0.3s ease;
      
      &.is-active {
        border-color: var(--zir-emerald);
        background: rgba(16, 185, 129, 0.05);
        
        .status-indicator {
          background: var(--zir-emerald);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
          animation: pulseGreen 2s infinite;
        }
        
        .status-text h3 { color: var(--zir-emerald); }
      }

      .bar-left {
        display: flex;
        align-items: center;
        gap: 24px;
      }

      .status-indicator {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--text-muted);
        transition: all 0.3s ease;
      }

      .status-text {
        h3 { margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: var(--text-secondary); transition: color 0.3s ease; }
        p { margin: 0; font-size: 13px; color: var(--text-muted); font-weight: 600; }
      }

      .toggle-btn {
        padding: 16px 32px;
        border-radius: 99px;
        font-size: 15px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--surface-hover);
        color: var(--text-primary);
        border: 1px solid var(--border-light);
        
        &.active-btn {
          background: var(--zir-emerald);
          color: white;
          border-color: var(--zir-emerald);
        }
      }
    }

    @keyframes pulseGreen {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }

    .main-card { background: var(--surface); border: 1px solid var(--border-light); border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
    .truck-display {
      height: 250px; background: linear-gradient(135deg, #1e293b, #0f172a); position: relative;
      display: flex; align-items: center; justify-content: center;
    }
    .bg-icon { font-size: 120px; color: rgba(255,255,255,0.05); }
    .license-plate {
      position: absolute; bottom: 24px; left: 24px; padding: 12px 24px; background: rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: white; font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px;
    }
    .edit-btn {
      position: absolute; top: 24px; right: 24px; background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2);
      &:hover { background: rgba(255,255,255,0.2); }
    }

    .card-details { padding: 40px; }

    .truck-info h2 { font-size: 24px; font-weight: 850; color: var(--text-primary); margin: 0 0 16px 0; }
    .spec-badge {
      display: inline-block; padding: 6px 16px; background: rgba(16, 185, 129, 0.1); color: var(--zir-emerald);
      border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 20px; font-size: 13px; font-weight: 900; margin-bottom: 24px;
    }
    .gov { font-size: 15px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; margin: 0; }
    .rating { font-size: 15px; color: var(--text-secondary); margin: 12px 0 0 0; }
    
    .edit-form h3 { margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 800; }
    .zir-form-group { margin-bottom: 16px; }
    .zir-form-group label { display: block; font-size: 13px; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; }

    @media (max-width: 768px) {
      .vehicles-container { padding: 20px; }
      .availability-bar { flex-direction: column; align-items: stretch; gap: 24px; text-align: center; }
      .availability-bar .bar-left { flex-direction: column; gap: 16px; }
    }
  `]
})
export class DriverVehiclesComponent implements OnInit {
  private api = inject(LogisticsApiService);
  
  profile = this.api.myProfile;
  isLoading = this.api.isLoadingProfile;

  isEditing = signal(false);
  editForm: Partial<DriverProfile> = {};

  ngOnInit() {
    this.api.fetchMyProfile().subscribe();
  }

  toggleAvailability() {
    const current = this.profile()?.is_available;
    this.api.updateProfile({ is_available: !current }).subscribe();
  }

  cancelEdit() {
    this.isEditing.set(false);
  }

  saveProfile() {
    this.api.updateProfile(this.editForm).subscribe(() => {
      this.isEditing.set(false);
    });
  }
}
