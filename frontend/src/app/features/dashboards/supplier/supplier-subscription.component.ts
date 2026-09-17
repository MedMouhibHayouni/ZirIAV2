import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle2, lucideXCircle, lucideZap, lucideCreditCard, lucideShieldCheck, lucideAlertTriangle } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-supplier-subscription',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideCheckCircle2, lucideXCircle, lucideZap, lucideCreditCard, lucideShieldCheck, lucideAlertTriangle })],
  templateUrl: './supplier-subscription.component.html',
  styleUrls: ['./supplier-subscription.component.scss']
})

export class SupplierSubscriptionComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  
  plans: any[] = [];
  activeSubscription: any = null;
  loading = true;
  actionLoading = false;

  showConfirmModal = false;
  selectedPlan: any = null;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.cdr.markForCheck();
    
    // Load Plans
    this.http.get<any[]>(`${environment.apiUrl}/supplier/plans`).subscribe({
      next: (res) => {
        this.plans = res;
        this.checkActiveSubscription();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  checkActiveSubscription() {
    this.http.get<any>(`${environment.apiUrl}/supplier/plans/my-subscription`).subscribe({
      next: (sub) => {
        this.activeSubscription = sub;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openConfirmModal(plan: any) {
    this.selectedPlan = plan;
    this.showConfirmModal = true;
    this.cdr.markForCheck();
  }

  closeModal() {
    this.showConfirmModal = false;
    this.selectedPlan = null;
    this.cdr.markForCheck();
  }

  confirmSubscription() {
    if (!this.selectedPlan) return;
    this.actionLoading = true;
    this.cdr.markForCheck();
    this.http.post(`${environment.apiUrl}/supplier/plans/subscribe/${this.selectedPlan.plan_code}`, {}).subscribe({
      next: (res) => {
        this.actionLoading = false;
        this.closeModal();
        this.activeSubscription = res;
        this.cdr.markForCheck();
        alert('Abonnement mis à jour avec succès !');
        // Refresh page to update shell links
        window.location.reload();
      },
      error: (err) => {
        this.actionLoading = false;
        this.cdr.markForCheck();
        alert(err.error?.message || 'Erreur lors de la souscription.');
      }
    });
  }

  cancelSubscription() {
    if (confirm('Voulez-vous vraiment annuler votre abonnement actuel ? Vous perdrez l\'accès aux fonctionnalités Premium.')) {
      this.actionLoading = true;
      this.cdr.markForCheck();
      this.http.post(`${environment.apiUrl}/supplier/plans/cancel`, {}).subscribe({
        next: () => {
          this.actionLoading = false;
          this.activeSubscription = null;
          this.cdr.markForCheck();
          alert('Abonnement annulé.');
          window.location.reload();
        },
        error: (err) => {
          this.actionLoading = false;
          this.cdr.markForCheck();
          alert(err.error?.message || 'Erreur lors de l\'annulation.');
        }
      });
    }
  }

  hasFeature(plan: any, feature: string): boolean {
    return plan.features_json.includes(feature);
  }
}
