import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideFlag, lucideLoader, lucideCheckCircle, lucideMapPin, lucideSend,
  lucideCamera, lucideX, lucideAlertTriangle, lucideThumbsUp, lucideUser,
  lucideFileText, lucideRuler, lucideSprout, lucideRefreshCw, lucidePlus
} from '@ng-icons/lucide';
import { AmbassadorApiService, FieldReport, ZoneFarmer } from '../../../core/services/ambassador-api.service';
import { NotificationStore } from '../../../core/state/notification.store';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface FieldReportForm {
  severity: Severity;
  farmer_id: string;
  crop_type: string;
  affected_area_ha: number | null;
  observations: string;
  recommendations: string;
  gps_lat: number | null;
  gps_lng: number | null;
  photo_urls: string[];
}

const SEVERITY_CONFIG = [
  { value: 'LOW' as Severity, emoji: '🟢', label: 'Faible', desc: 'Inhabituel', color: '#16a34a', bg: '#dcfce7', glow: 'rgba(22,163,74,0.25)' },
  { value: 'MEDIUM' as Severity, emoji: '🟡', label: 'Moyen', desc: 'Préoccupant', color: '#d97706', bg: '#fef3c7', glow: 'rgba(217,119,6,0.25)' },
  { value: 'HIGH' as Severity, emoji: '🔴', label: 'Élevé', desc: 'Risque pertes', color: '#dc2626', bg: '#fee2e2', glow: 'rgba(220,38,38,0.25)' },
  { value: 'CRITICAL' as Severity, emoji: '🚨', label: 'Critique', desc: 'Intervention!', color: '#991b1b', bg: '#fecaca', glow: 'rgba(153,27,27,0.35)' },
];

@Component({
  selector: 'app-amb-field-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideFlag, lucideLoader, lucideCheckCircle, lucideMapPin, lucideSend,
    lucideCamera, lucideX, lucideAlertTriangle, lucideThumbsUp, lucideUser,
    lucideFileText, lucideRuler, lucideSprout, lucideRefreshCw, lucidePlus
  })],
  templateUrl: './amb-field-reports.component.html',
  styleUrl: './amb-field-reports.component.scss'
})
export class AmbFieldReportsComponent implements OnInit {
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('obsTextarea') obsRef!: ElementRef<HTMLTextAreaElement>;

  private readonly api = inject(AmbassadorApiService);
  private readonly notifs = inject(NotificationStore);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly severities = SEVERITY_CONFIG;

  // State
  reports = signal<FieldReport[]>([]);
  farmers = signal<ZoneFarmer[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  submitted = signal<{ reportId: string; notifiedExperts: number; severity: Severity } | null>(null);

  // GPS state
  gpsStatus = signal<'idle' | 'loading' | 'captured' | 'failed'>('idle');
  gpsCoords = signal<{ lat: number; lng: number } | null>(null);
  manualGps = signal(false);
  manualLat = '';
  manualLng = '';

  // Farmer search
  farmerSearch = signal('');
  selectedFarmer = signal<ZoneFarmer | null>(null);
  showFarmerDropdown = signal(false);

  filteredFarmers = computed(() => {
    const q = this.farmerSearch().toLowerCase();
    if (!q) return this.farmers().slice(0, 8);
    return this.farmers().filter(f =>
      f.display_name.toLowerCase().includes(q) || (f.delegation || '').toLowerCase().includes(q)
    ).slice(0, 8);
  });

  // Photo uploads
  photoPreviewUrls = signal<string[]>([]);
  isDragOver = signal(false);

  // Form
  form: FieldReportForm = {
    severity: 'MEDIUM',
    farmer_id: '',
    crop_type: '',
    affected_area_ha: null,
    observations: '',
    recommendations: '',
    gps_lat: null,
    gps_lng: null,
    photo_urls: []
  };

  // Template helper
  readonly setTimeout = setTimeout;
  
  today = new Date().toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  ngOnInit(): void {
    this.api.getFieldReports().subscribe(r => {
      this.reports.set(r || []);
      this.isLoading.set(false);
      this.cdr.markForCheck();
    });
    this.api.getZoneFarmers().subscribe(f => {
      this.farmers.set(f || []);
      this.cdr.markForCheck();
    });
  }

  setSeverity(sev: Severity) {
    this.form.severity = sev;
    this.cdr.markForCheck();
  }

  getSeverityConfig(sev: Severity) {
    return SEVERITY_CONFIG.find(s => s.value === sev) ?? SEVERITY_CONFIG[1];
  }

  // ── Farmer Search ─────────────────────────────────────────────────────────
  onFarmerSearchChange(query: string) {
    this.farmerSearch.set(query);
    this.showFarmerDropdown.set(true);
    if (!query) { this.selectedFarmer.set(null); this.form.farmer_id = ''; }
    this.cdr.markForCheck();
  }

  selectFarmer(farmer: ZoneFarmer) {
    this.selectedFarmer.set(farmer);
    this.form.farmer_id = farmer.id;
    this.farmerSearch.set(farmer.display_name);
    this.showFarmerDropdown.set(false);
    this.cdr.markForCheck();
  }

  clearFarmer() {
    this.selectedFarmer.set(null);
    this.form.farmer_id = '';
    this.farmerSearch.set('');
    this.cdr.markForCheck();
  }

  // ── GPS ───────────────────────────────────────────────────────────────────
  captureGps() {
    if (!navigator.geolocation) {
      this.gpsStatus.set('failed');
      this.manualGps.set(true);
      this.cdr.markForCheck();
      return;
    }
    this.gpsStatus.set('loading');
    this.cdr.markForCheck();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000000) / 10000000;
        const lng = Math.round(pos.coords.longitude * 10000000) / 10000000;
        this.gpsCoords.set({ lat, lng });
        this.form.gps_lat = lat;
        this.form.gps_lng = lng;
        this.gpsStatus.set('captured');
        this.cdr.markForCheck();
      },
      () => {
        this.gpsStatus.set('failed');
        this.manualGps.set(true);
        this.cdr.markForCheck();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  applyManualGps() {
    const lat = parseFloat(this.manualLat);
    const lng = parseFloat(this.manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      this.form.gps_lat = lat;
      this.form.gps_lng = lng;
      this.gpsCoords.set({ lat, lng });
      this.gpsStatus.set('captured');
      this.manualGps.set(false);
      this.cdr.markForCheck();
    }
  }

  // ── Photos ────────────────────────────────────────────────────────────────
  triggerPhotoUpload() {
    this.photoInput?.nativeElement.click();
  }

  onPhotoDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
    this.processPhotoFiles(files);
  }

  onPhotoSelect(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    this.processPhotoFiles(files);
  }

  processPhotoFiles(files: File[]) {
    const current = this.photoPreviewUrls();
    const remaining = 4 - current.length;
    const toAdd = files.slice(0, remaining);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        this.photoPreviewUrls.update(arr => [...arr, url]);
        this.form.photo_urls = [...this.form.photo_urls, url];
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    });
  }

  removePhoto(index: number) {
    this.photoPreviewUrls.update(arr => arr.filter((_, i) => i !== index));
    this.form.photo_urls = this.form.photo_urls.filter((_, i) => i !== index);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  submit() {
    if (!this.form.observations.trim()) {
      this.notifs.showError('Les observations sont obligatoires');
      return;
    }
    this.isSubmitting.set(true);

    const payload = {
      description: this.form.observations, // map observations to description for backend compat
      observations: this.form.observations,
      recommendations: this.form.recommendations,
      severity: this.form.severity,
      crop_type: this.form.crop_type || undefined,
      affected_crop_type: this.form.crop_type || undefined,
      affected_area_ha: this.form.affected_area_ha ?? undefined,
      gps_lat: this.form.gps_lat ?? undefined,
      gps_lng: this.form.gps_lng ?? undefined,
      farmer_id: this.form.farmer_id || undefined,
      photo_urls: this.form.photo_urls.length > 0 ? this.form.photo_urls : undefined,
    };

    this.api.submitFieldReport(payload as any).subscribe({
      next: (r: any) => {
        this.reports.update(l => [r, ...l]);
        this.submitted.set({
          reportId: r.id,
          notifiedExperts: r.notified_experts ?? 0,
          severity: this.form.severity
        });
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.notifs.showError('Erreur lors de l\'envoi du rapport');
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  resetForm() {
    this.form = {
      severity: 'MEDIUM', farmer_id: '', crop_type: '',
      affected_area_ha: null, observations: '', recommendations: '',
      gps_lat: null, gps_lng: null, photo_urls: []
    };
    this.submitted.set(null);
    this.selectedFarmer.set(null);
    this.farmerSearch.set('');
    this.gpsStatus.set('idle');
    this.gpsCoords.set(null);
    this.manualGps.set(false);
    this.photoPreviewUrls.set([]);
    this.cdr.markForCheck();
  }

  getSevLabel(sev: string): string {
    const map: Record<string, string> = { LOW: '🟢 Faible', MEDIUM: '🟡 Moyen', HIGH: '🔴 Élevé', CRITICAL: '🚨 Critique' };
    return map[sev] ?? sev;
  }
}
