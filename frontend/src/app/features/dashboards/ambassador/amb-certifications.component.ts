import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { FormsModule } from '@angular/forms';
import {
  lucideAward, lucideUser, lucideCheckCircle, lucideXCircle,
  lucideExternalLink, lucideCalendar, lucideFileText, lucideAlertTriangle,
  lucideBookOpen, lucideCheck, lucideX
} from '@ng-icons/lucide';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-amb-certifications',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({
    lucideAward, lucideUser, lucideCheckCircle, lucideXCircle,
    lucideExternalLink, lucideCalendar, lucideFileText, lucideAlertTriangle,
    lucideBookOpen, lucideCheck, lucideX
  })],
  templateUrl: './amb-certifications.component.html',
  styleUrl: './amb-certifications.component.scss'
})
export class AmbCertificationsComponent implements OnInit {
  private http = inject(HttpClient);
  private notifs = inject(NotificationStore);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(true);
  certifications = signal<any[]>([]);

  // Rejection modal signals
  showRejectModal = signal(false);
  selectedCertId = signal<string | null>(null);
  rejectionReason = signal('');

  ngOnInit() {
    this.loadPendingCertifications();
  }

  loadPendingCertifications() {
    this.isLoading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/ambassador/pending-certifications`).subscribe({
      next: (res) => {
        this.certifications.set(res || []);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  verifyCert(certId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) {
    const payload = {
      verification_status: status,
      rejection_reason: reason || undefined
    };

    this.http.patch<any>(`${environment.apiUrl}/workers/certifications/${certId}/verify`, payload).subscribe({
      next: () => {
        if (status === 'VERIFIED') {
          this.notifs.showSuccess('Certification validée avec succès ! Le profil du travailleur a été mis à jour.');
        } else {
          this.notifs.showWarning('Certification rejetée.');
        }
        
        // Remove from list
        this.certifications.update(list => list.filter(c => c.id !== certId));
        this.showRejectModal.set(false);
        this.rejectionReason.set('');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || 'Erreur lors du traitement de la certification.');
      }
    });
  }

  openRejectModal(certId: string) {
    this.selectedCertId.set(certId);
    this.rejectionReason.set('');
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
  }

  submitRejection() {
    const reason = this.rejectionReason().trim();
    if (!reason) {
      this.notifs.showWarning('Veuillez renseigner un motif de rejet.');
      return;
    }
    const certId = this.selectedCertId();
    if (certId) {
      this.verifyCert(certId, 'REJECTED', reason);
    }
  }

  openDocument(url?: string) {
    if (!url) return;
    window.open(url, '_blank');
  }
}
