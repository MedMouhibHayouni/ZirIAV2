import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy,
  OnDestroy, PLATFORM_ID
} from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBriefcase, lucideLoader, lucideMapPin, lucideCalendar,
  lucideCheckCircle, lucideFilter, lucideDollarSign, lucidePhone,
  lucideClock, lucideChevronDown, lucideX, lucideAlertCircle
} from '@ng-icons/lucide';
import { AuthService } from '../../../core/services/auth.service';
import { ContractsApiService, MissionContract } from '../../../core/services/contracts-api.service';

interface JobOffer {
  id: string;
  task_type: string;
  employer?: { name: string; phone?: string };
  governorate: string;
  start_date: string;
  duration_days: number;
  daily_pay_tnd: number;
  description: string;
  status: string;
  _applying?: boolean;
  _applied?: boolean;
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  navigation_deep_link?: string | null;
  mission_context_snapshot?: {
    parcel_name: string;
    surface_ha?: number | null;
    center_gps?: { lat: number; lng: number } | null;
    boundary_geojson?: any;
    crop_type: string;
    task_type: string;
    description: string;
    daily_pay_tnd: number;
    duration_days: number;
    estimated_total_earnings_tnd: number;
    start_date: string;
    employer_name: string;
    employer_phone?: string | null;
    navigation_deep_link?: string | null;
  } | null;
  jobOffer?: {
    task_type: string;
    employer?: { name: string; phone?: string };
    governorate: string;
    start_date: string;
    daily_pay_tnd: number;
    lat?: number | null;
    lng?: number | null;
    boundary?: any;
  };
}

const SKILL_OPTIONS = ['Récolte','Taille','Irrigation','Conduite','Plantation','Traitement'];
const GOVERNORATES = ['Tunis','Sfax','Sousse','Kairouan','Gafsa','Gabès','Béja','Jendouba','Nabeul','Bizerte','Kasserine','Sidi Bouzid','Médenine','Monastir','Mahdia','Kef','Siliana','Tozeur','Kébili','Tataouine','Ariana','Manouba','Ben Arous','Zaghouan'];

function urgencyClass(startDate: string): 'urgent' | 'soon' | 'later' {
  const start = new Date(startDate);
  const now = new Date();
  const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 3) return 'urgent';
  if (diffDays <= 7) return 'soon';
  return 'later';
}

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-worker-jobs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule, RouterModule],
  providers: [provideIcons({
    lucideBriefcase, lucideLoader, lucideMapPin, lucideCalendar,
    lucideCheckCircle, lucideFilter, lucideDollarSign, lucidePhone,
    lucideClock, lucideChevronDown, lucideX, lucideAlertCircle
  })],
  templateUrl: './worker-jobs.component.html',
  styleUrls: ['./worker-jobs.component.scss'],
})
export class WorkerJobsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private contractsApi = inject(ContractsApiService);
  private platformId = inject(PLATFORM_ID);

  activeTab = signal<'OFFERS' | 'MY_APPS'>('OFFERS');

  jobs = signal<JobOffer[]>([]);
  applications = signal<Application[]>([]);
  contracts = signal<MissionContract[]>([]);
  isLoading = signal(true);
  isLoadingApps = signal(false);

  expandedAppId = signal<string | null>(null);
  private workerMaps: Record<string, any> = {};

  // Chat modal signals
  chatRecipient = signal<{ id: string; name: string } | null>(null);
  chatMessageText = signal('');
  isSendingChat = signal(false);

  // Toast
  toast = signal<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  govFilter = '';
  skillFilter = '';
  fromDate = '';

  readonly governorates = GOVERNORATES;
  readonly skills = SKILL_OPTIONS;

  pendingAppCount = computed(() =>
    this.applications().filter(a => a.status === 'PENDING').length
  );

  currentPage = 1;
  totalPages = signal(1);

  ngOnInit() {
    this.loadJobs();
    this.loadApplications();
  }

  loadJobs() {
    this.isLoading.set(true);
    
    let url = `${environment.apiUrl}/workers/job-offers?limit=9&page=${this.currentPage}`;
    if (this.govFilter) url += `&governorate=${this.govFilter}`;
    if (this.skillFilter) url += `&task_type=${this.skillFilter}`;
    if (this.fromDate) url += `&from=${this.fromDate}`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        const items = data.items || data || [];
        this.jobs.set(items);
        if (data.total !== undefined) {
           this.totalPages.set(Math.ceil(data.total / 9) || 1);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage) {
      this.currentPage = page;
      this.loadJobs();
    }
  }

  applyFilters() { 
    this.currentPage = 1;
    this.loadJobs(); 
  }

  // Expansion logic for details
  expandedJobId = signal<string | null>(null);

  toggleJobDetails(jobId: string) {
    if (this.expandedJobId() === jobId) {
      this.expandedJobId.set(null);
    } else {
      this.expandedJobId.set(jobId);
    }
  }

  getPages(): number[] {
    return Array.from({length: this.totalPages()}, (_, i) => i + 1);
  }

  loadApplications() {
    this.isLoadingApps.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/workers/my-applications`).subscribe({
      next: (data) => {
        this.applications.set(Array.isArray(data) ? data : []);
        this.isLoadingApps.set(false);
        this.loadContracts();
      },
      error: () => this.isLoadingApps.set(false),
    });
  }

  loadContracts() {
    this.contractsApi.getMyContracts().subscribe({
      next: (data) => this.contracts.set(data || []),
    });
  }

  getContractForApplication(appId: string): MissionContract | undefined {
    return this.contracts().find(c => c.reference_id === appId);
  }

  getContractStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING_ACCEPTANCE': 'À signer',
      'ACTIVE': 'Signé',
      'COMPLETED': 'Terminé',
      'DISPUTED': 'Litige ⚠️',
      'RESOLVED': 'Résolu',
      'CANCELLED': 'Annulé'
    };
    return labels[status] || status;
  }

  getContractStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_ACCEPTANCE': return 'zir-badge--info';
      case 'ACTIVE': return 'zir-badge--success';
      case 'DISPUTED': return 'zir-badge--danger';
      case 'COMPLETED': return 'zir-badge--default';
      default: return 'zir-badge--default';
    }
  }



  urgencyClass(job: JobOffer): string {
    return urgencyClass(job.start_date);
  }

  applyForJob(job: JobOffer) {
    if (job._applied) return;
    job._applying = true;
    this.jobs.update(jobs => [...jobs]); // trigger CD
    this.http.post(`${environment.apiUrl}/workers/job-offers/${job.id}/apply`, {}).subscribe({
      next: () => {
        job._applied = true;
        job._applying = false;
        this.jobs.update(jobs => [...jobs]);
        this.loadApplications();
      },
      error: (err) => {
        job._applying = false;
        if (err.status === 409) { job._applied = true; }
        this.jobs.update(jobs => [...jobs]);
      },
    });
  }

  isAlreadyApplied(jobId: string): boolean {
    return this.applications().some(a => a.jobOffer && (a as any).job_offer_id === jobId);
  }

  formatWage(wage: number): string { return `${wage} TND/jour`; }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'ACCEPTED': return 'Acceptée ✓';
      case 'REJECTED': return 'Non retenue';
      case 'COMPLETED': return 'Complétée';
      default: return status;
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'zir-badge--warning';
      case 'ACCEPTED': return 'zir-badge--success';
      case 'REJECTED': return 'zir-badge--danger';
      default: return 'zir-badge--info';
    }
  }

  toggleAppDetails(appId: string) {
    if (this.expandedAppId() === appId) {
      this.expandedAppId.set(null);
    } else {
      this.expandedAppId.set(appId);
      setTimeout(() => {
        const app = this.applications().find(a => a.id === appId);
        if (app) {
          const context = app.mission_context_snapshot || (app as any).jobOffer;
          const lat = context?.center_gps?.lat ?? context?.lat;
          const lng = context?.center_gps?.lng ?? context?.lng;
          const boundary = context?.boundary_geojson ?? context?.boundary;
          if (lat && lng) {
            this.initWorkerMap(appId, Number(lat), Number(lng), boundary);
          }
        }
      }, 100);
    }
  }

  private async initWorkerMap(appId: string, lat: number, lng: number, boundary?: any) {
    if (!isPlatformBrowser(this.platformId)) return;
    const mapContainerId = `worker-map-${appId}`;
    const container = document.getElementById(mapContainerId);
    if (!container) return;

    if (this.workerMaps[appId]) {
      try {
        this.workerMaps[appId].remove();
      } catch (e) {}
      delete this.workerMaps[appId];
    }

    try {
      const L = await import('leaflet');
      const map = L.map(container, { zoomControl: true, attributionControl: false }).setView([lat, lng], 13);
      this.workerMaps[appId] = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Add center marker with a custom green marker or circular marker
      L.circleMarker([lat, lng], {
        radius: 8,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.9,
      }).addTo(map).bindPopup('Emplacement de la parcelle').openPopup();

      if (boundary) {
        try {
          const geojsonFeature = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
          const poly = L.geoJSON(geojsonFeature, {
            style: {
              color: '#10b981',
              weight: 3,
              opacity: 0.8,
              fillColor: '#10b981',
              fillOpacity: 0.2
            }
          }).addTo(map);
          map.fitBounds(poly.getBounds());
        } catch (err) {
          console.error('Failed to parse boundary GeoJSON:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load Leaflet map:', err);
    }
  }

  openChatModal(recipientId: string, recipientName: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.chatRecipient.set({ id: recipientId, name: recipientName });
    this.chatMessageText.set('');
  }

  closeChatModal() {
    this.chatRecipient.set(null);
    this.chatMessageText.set('');
  }

  sendChatMessage() {
    const text = this.chatMessageText().trim();
    const rcpt = this.chatRecipient();
    if (!text || !rcpt) return;

    this.isSendingChat.set(true);
    this.http.post(`${environment.apiUrl}/messages`, {
      receiverId: rcpt.id,
      content: text
    }).subscribe({
      next: () => {
        this.isSendingChat.set(false);
        this.closeChatModal();
        this.showToast('Message envoyé', `Votre message à ${rcpt.name} a été envoyé.`);
      },
      error: () => {
        this.isSendingChat.set(false);
        this.showToast('Erreur', 'Impossible d\'envoyer le message. Veuillez réessayer.', 'error');
      }
    });
  }

  showToast(title: string, desc: string, type: 'success' | 'error' = 'success') {
    this.toast.set({ title, desc, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  ngOnDestroy() {
    Object.keys(this.workerMaps).forEach(appId => {
      try {
        this.workerMaps[appId].remove();
      } catch (e) {}
    });
    this.workerMaps = {};
  }
}
