import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogisticsApiService, DriverProfile } from '../../../core/services/logistics-api.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTruck, lucideUser, lucideMapPin, lucideStar, lucideCheckCircle,
  lucideSettings, lucideSave, lucidePower, lucideEdit3, lucideInfo,
  lucideAward, lucidePlus, lucideX, lucideClock, lucideCalendar,
  lucideAlertTriangle, lucideTrash2, lucideBookOpen, lucidePhone,
  lucideShield
} from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideTruck, lucideUser, lucideMapPin, lucideStar, lucideCheckCircle,
    lucideSettings, lucideSave, lucidePower, lucideEdit3, lucideInfo,
    lucideAward, lucidePlus, lucideX, lucideClock, lucideCalendar,
    lucideAlertTriangle, lucideTrash2, lucideBookOpen, lucidePhone,
    lucideShield
  })],
  templateUrl: './driver-profile.component.html',
  styleUrl: './driver-profile.component.scss'
})
export class DriverProfileComponent implements OnInit {
  private api = inject(LogisticsApiService);
  private notifs = inject(NotificationStore);
  private cdr = inject(ChangeDetectorRef);

  profile = signal<Partial<DriverProfile & { user?: { name: string; phone: string } }>>({
    vehicle_type: 'TRUCK',
    capacity_tonnes: 5,
    governorate: 'Tunis',
    is_available: true,
    rating: 5.0,
    vehicle_plate: '',
    license_number: '',
    user: { name: 'Chauffeur', phone: '' }
  });

  isSaving = signal(false);
  isEditingVehicle = signal(false);

  editForm: Partial<DriverProfile> = {};

  // Documents (permits, license)
  showDocModal = signal(false);
  docForm = {
    doc_name: '',
    doc_number: '',
    issued_date: '',
    expiry_date: '',
    issuing_authority: '',
    document_url: ''
  };

  ngOnInit() {
    this.api.fetchMyProfile().subscribe({
      next: (data) => {
        if (data) this.profile.set(data as any);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  toggleAvailability() {
    const nextVal = !this.profile().is_available;
    this.profile.update(p => ({ ...p, is_available: nextVal }));
    this.api.updateProfile({ is_available: nextVal }).subscribe({
      next: () => {
        this.notifs.showSuccess(nextVal ? 'Vous êtes maintenant en ligne !' : 'Vous êtes hors ligne.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.profile.update(p => ({ ...p, is_available: !nextVal }));
        this.cdr.markForCheck();
      }
    });
  }

  startEditVehicle() {
    const p = this.profile();
    this.editForm = {
      vehicle_type: p.vehicle_type as any,
      capacity_tonnes: p.capacity_tonnes,
      vehicle_plate: p.vehicle_plate ?? '',
      license_number: (p as any).license_number ?? '',
      governorate: p.governorate ?? ''
    };
    this.isEditingVehicle.set(true);
  }

  cancelEditVehicle() {
    this.isEditingVehicle.set(false);
  }

  saveVehicle() {
    this.isSaving.set(true);
    this.api.updateProfile(this.editForm).subscribe({
      next: (data) => {
        if (data) this.profile.update(p => ({ ...p, ...data }));
        this.isSaving.set(false);
        this.isEditingVehicle.set(false);
        this.notifs.showSuccess('Véhicule mis à jour avec succès.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSaving.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  savePersonalInfo() {
    this.isSaving.set(true);
    this.api.updateProfile(this.profile() as any).subscribe({
      next: (data) => {
        if (data) this.profile.update(p => ({ ...p, ...data }));
        this.isSaving.set(false);
        this.notifs.showSuccess('Informations enregistrées avec succès.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSaving.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  updateUserName(val: string) { this.profile.update(p => ({ ...p, user: { ...(p as any).user, name: val } })); }
  updateUserPhone(val: string) { this.profile.update(p => ({ ...p, user: { ...(p as any).user, phone: val } })); }
  updateGovernorate(val: string) { this.profile.update(p => ({ ...p, governorate: val })); }

  openDocModal() {
    this.docForm = { doc_name: '', doc_number: '', issued_date: '', expiry_date: '', issuing_authority: '', document_url: '' };
    this.showDocModal.set(true);
  }

  closeDocModal() { this.showDocModal.set(false); }

  submitDocument() {
    if (!this.docForm.doc_name) {
      this.notifs.showWarning('Le nom du document est obligatoire.');
      return;
    }
    this.notifs.showSuccess('Document soumis pour vérification. Nos équipes vous contacteront sous 48h.');
    this.showDocModal.set(false);
    this.cdr.markForCheck();
  }

  getVehicleLabel(type: string): string {
    const labels: Record<string, string> = {
      'TRUCK': 'Camion', 'VAN': 'Fourgon', 'PICKUP': 'Pickup',
      'REFRIGERATED': 'Réfrigéré', 'SEMI': 'Semi-remorque'
    };
    return labels[type] || type;
  }
}
