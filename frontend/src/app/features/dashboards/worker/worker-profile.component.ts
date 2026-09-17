import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgriJobApiService, WorkerProfile, WorkerCertification } from '../../../core/services/agrijob-api.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUser, lucideWrench, lucideCalendar, lucideSave, lucidePlus, lucideX,
  lucideMap, lucideDollarSign, lucideInfo, lucideCheckCircle, lucideStar,
  lucideBell, lucideAward, lucideChevronRight, lucideClock, lucideTrash2,
  lucideMapPin, lucidePhone, lucideBookOpen, lucideAlertTriangle
} from '@ng-icons/lucide';
import { FormsModule } from '@angular/forms';
import { NotificationStore } from '../../../core/state/notification.store';
import { TUNISIA_GOVERNORATES } from '../../../core/constants/governorates';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-worker-profile',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({
    lucideUser, lucideWrench, lucideCalendar, lucideSave, lucidePlus, lucideX,
    lucideMap, lucideDollarSign, lucideInfo, lucideCheckCircle, lucideStar,
    lucideBell, lucideAward, lucideChevronRight, lucideClock, lucideTrash2,
    lucideMapPin, lucidePhone, lucideBookOpen, lucideAlertTriangle
  })],
  templateUrl: './worker-profile.component.html',
  styleUrl: './worker-profile.component.scss'
})
export class WorkerProfileComponent implements OnInit {
  private api = inject(AgriJobApiService);
  private notifs = inject(NotificationStore);
  private cdr = inject(ChangeDetectorRef);

  // Liste canonique partagée — une seule valeur sélectionnable (Fix 5)
  readonly governorates: readonly string[] = TUNISIA_GOVERNORATES;

  profile = signal<Partial<WorkerProfile>>({
    skills: [],
    radius_km: 30,
    daily_rate_tnd: 50,
    bio: '',
    is_available: true,
    rating: 5.0,
    total_jobs_done: 0,
    governorate: 'Tunis',
    user: { name: 'Travailleur', phone: '' }
  });

  certifications = signal<WorkerCertification[]>([]);
  ratings = signal<any[]>([]);

  newSkill = signal('');
  isSaving = signal(false);

  // Certification Form Signals
  showCertModal = signal(false);
  certForm = {
    certification_name: '',
    issuing_organization: '',
    issued_date: '',
    expiry_date: '',
    description: '',
    document_url: ''
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.fetchMyProfile().subscribe({
      next: (data) => {
        if (data) this.profile.set(data);
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.api.getMyCertifications().subscribe({
      next: (certs) => {
        this.certifications.set(certs || []);
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.api.getMyRatings().subscribe({
      next: (rates) => {
        this.ratings.set(rates || []);
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
        this.notifs.showSuccess(nextVal ? 'Disponibilité activée ! Les agriculteurs peuvent vous contacter.' : 'Disponibilité désactivée.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.profile.update(p => ({ ...p, is_available: !nextVal }));
        this.cdr.markForCheck();
      }
    });
  }

  addSkill() {
    const skill = this.newSkill().trim();
    if (skill && !this.profile().skills?.includes(skill)) {
      this.profile.update(p => ({
        ...p,
        skills: [...(p.skills || []), skill]
      }));
      this.newSkill.set('');
    }
  }

  removeSkill(skill: string) {
    this.profile.update(p => ({
      ...p,
      skills: (p.skills || []).filter(s => s !== skill)
    }));
  }

  updateUserName(val: string) {
    this.profile.update(p => ({
      ...p,
      user: { ...(p.user || { name: '', phone: '' }), name: val }
    }));
  }

  updateUserPhone(val: string) {
    this.profile.update(p => ({
      ...p,
      user: { ...(p.user || { name: '', phone: '' }), phone: val }
    }));
  }

  updateGovernorate(val: string) {
    this.profile.update(p => ({ ...p, governorate: val }));
  }

  updateRadius(val: number) {
    this.profile.update(p => ({ ...p, radius_km: Number(val) }));
  }

  updateDailyRate(val: number) {
    this.profile.update(p => ({ ...p, daily_rate_tnd: Number(val) }));
  }

  updateBio(val: string) {
    this.profile.update(p => ({ ...p, bio: val }));
  }

  save() {
    this.isSaving.set(true);
    this.api.updateProfile(this.profile()).subscribe({
      next: (data: any) => {
        this.isSaving.set(false);
        if (data) {
          this.profile.set(data);
        }
        this.notifs.showSuccess('Profil professionnel enregistré avec succès.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSaving.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  openCertModal() {
    this.certForm = {
      certification_name: '',
      issuing_organization: '',
      issued_date: '',
      expiry_date: '',
      description: '',
      document_url: ''
    };
    this.showCertModal.set(true);
  }

  closeCertModal() {
    this.showCertModal.set(false);
  }

  submitCertification() {
    if (!this.certForm.certification_name) {
      this.notifs.showWarning('Le nom de la certification est obligatoire.');
      return;
    }

    this.api.addCertification(this.certForm).subscribe({
      next: (cert) => {
        this.notifs.showSuccess('Certification soumise avec succès ! Elle sera vérifiée par votre ambassadeur.');
        this.certifications.update(c => [cert, ...c]);
        this.showCertModal.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || 'Erreur lors de la soumission de la certification.');
      }
    });
  }

  deleteCert(certId: string) {
    if (confirm('Voulez-vous vraiment supprimer cette certification ?')) {
      this.api.deleteCertification(certId).subscribe({
        next: () => {
          this.notifs.showSuccess('Certification supprimée.');
          this.certifications.update(certs => certs.filter(c => c.id !== certId));
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.notifs.showError(err?.error?.message || 'Impossible de supprimer cette certification.');
        }
      });
    }
  }

  getStarsArray(rating: number): number[] {
    const rounded = Math.round(rating || 5);
    return Array(rounded).fill(0);
  }

  getEmptyStarsArray(rating: number): number[] {
    const rounded = Math.round(rating || 5);
    return Array(5 - rounded).fill(0);
  }
}
