import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCamera, lucideImage, lucideCheckCircle, lucideAlertTriangle,
  lucideLoader, lucideShieldAlert, lucideRefreshCcw, lucideChevronLeft,
  lucideMapPin, lucideLeaf, lucideShoppingCart, lucideUser, lucideSprout,
  lucideFlaskConical, lucideArrowRight, lucideSend, lucideX, lucideActivity,
  lucideDroplets, lucideWind, lucideThermometer, lucideCheck
} from '@ng-icons/lucide';
import { FarmerApiService, FarmerParcel } from '../../../core/services/farmer-api.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { NameTranslationService } from '../../../core/services/name-translation.service';

type DiagnosticState = 'idle' | 'scanning' | 'result';

const SCAN_PHRASES = [
  { fr: 'Analyse de l\'image en cours…', ar: 'تحليل الصورة...' },
  { fr: 'Détection des pathogènes…', ar: 'كشف الأمراض...' },
  { fr: 'Comparaison avec la base de données…', ar: 'مقارنة مع قاعدة البيانات...' },
  { fr: 'Évaluation des conditions météo…', ar: 'تقييم الطقس...' },
  { fr: 'Génération des recommandations…', ar: 'إنتاج التوصيات...' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-diagnostic',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideCamera, lucideImage, lucideCheckCircle, lucideAlertTriangle,
    lucideLoader, lucideShieldAlert, lucideRefreshCcw, lucideChevronLeft,
    lucideMapPin, lucideLeaf, lucideShoppingCart, lucideUser, lucideSprout,
    lucideFlaskConical, lucideArrowRight, lucideSend, lucideX, lucideActivity,
    lucideDroplets, lucideWind, lucideThermometer, lucideCheck
  })],
  templateUrl: './farmer-diagnostic.component.html',
  styleUrl: './farmer-diagnostic.component.scss'
})
export class FarmerDiagnosticComponent implements OnInit, OnDestroy {
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileDropZone') fileDropZone!: ElementRef<HTMLDivElement>;

  private farmerApi = inject(FarmerApiService);
  private notifs = inject(NotificationStore);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private nameService = inject(NameTranslationService);

  // ── UI State ────────────────────────────────────────────────────────────────
  state = signal<DiagnosticState>('idle');
  isDragging = signal(false);

  // ── Parcel / File ───────────────────────────────────────────────────────────
  parcels = signal<FarmerParcel[]>([]);
  selectedParcelId = signal<string>('');
  selectedCrop = signal<string>('');
  previewUrl = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  // ── Scanning Animation ──────────────────────────────────────────────────────
  scanPhraseIndex = signal(0);
  scanPhrase = computed(() => SCAN_PHRASES[this.scanPhraseIndex()]);
  private scanInterval: any;
  private phraseInterval: any;

  // ── Result ──────────────────────────────────────────────────────────────────
  result = signal<any>(null);
  gaugeOffset = signal(283);
  savedDetectionId = signal<string | null>(null);
  isSubmitting = signal(false);
  isLinking = signal(false);
  isOrdering = signal(false);

  // ── Names (from dictionary or API payload) ─────────────────────────────────
  diseaseName = computed(() => {
    const r = this.result();
    // Prefer the name_fr from the API (already resolved via NameDictionary on the backend),
    // then fall back to vision.disease (raw key) for further client-side lookup.
    return r?.name_fr || r?.vision?.disease || r?.disease_name || '';
  });
  diseaseNameFr = computed(() => {
    const r = this.result();
    const isEscalation = (s?: string) => !s || s.includes('sûr') || s.includes('expert') || s.includes('Diagnostic blé');
    
    // 1. Backend-resolved name_fr (if not an escalation message)
    if (r?.name_fr && !isEscalation(r.name_fr)) return r.name_fr;
    if (r?.decision?.disease_fr && !isEscalation(r.decision.disease_fr)) return r.decision.disease_fr;
    
    // 2. Client-side dictionary lookup on disease key or raw name
    const raw = r?.vision?.disease || r?.disease_name || '';
    if (!isEscalation(raw)) {
      const entry = this.nameService.getTranslationDetails(raw);
      if (entry?.name_fr && !isEscalation(entry.name_fr)) return entry.name_fr;
      return raw;
    }
    
    // 3. Fallback to top3 candidates if available
    const topCandidate = r?.vision?.top3?.[0]?.disease;
    if (topCandidate && !isEscalation(topCandidate)) return topCandidate;

    return r?.crop_type ? `${r.crop_type} — Diagnostic sous réserve d’expertise` : 'Diagnostic sous réserve d’expertise';
  });
  diseaseNameAr = computed(() => {
    const r = this.result();
    if (r?.name_ar) return r.name_ar;
    const raw = r?.vision?.disease || r?.disease_name || '';
    const entry = this.nameService.getTranslationDetails(raw);
    return entry?.name_ar || r?.disease_name_ar || r?.disease_name_ar || '';
  });
  diseaseNameLat = computed(() => {
    const r = this.result();
    if (r?.name_lat) return r.name_lat;
    const raw = r?.vision?.disease || r?.disease_name || '';
    const entry = this.nameService.getTranslationDetails(raw);
    return entry?.name_lat || r?.disease_name_lat || '';
  });

  // ── Expert Selection ─────────────────────────────────────────────────────────
  certifiedExperts = signal<any[]>([]);
  selectedExpertId = signal<string>('');
  expertSent = signal(false);

  // ── History ─────────────────────────────────────────────────────────────────
  history = signal<any[]>([]);
  isLoadingHistory = signal(true);
  selectedHistoryItem = signal<any>(null);

  // ── Sample photos for idle guidance ─────────────────────────────────────────
  readonly guidancePhotos = [
    { label: 'Gros plan feuille', icon: 'lucideLeaf', hint: 'ورقة عن قرب', color: '#22c55e' },
    { label: 'Gros plan tige', icon: 'lucideSprout', hint: 'جذع عن قرب', color: '#16a34a' },
    { label: 'Vue rang culture', icon: 'lucideActivity', hint: 'صف الزراعة', color: '#15803d' },
  ];

  ngOnInit() {
    const parcelId = this.route.snapshot.queryParamMap.get('parcel_id');
    if (parcelId) this.selectedParcelId.set(parcelId);

    this.farmerApi.fetchParcels().subscribe(() => {
      this.parcels.set(this.farmerApi.parcels());
    });

    this.farmerApi.fetchExperts().subscribe(experts => {
      this.certifiedExperts.set(experts || []);
    });

    this.loadHistory();
  }

  ngOnDestroy() {
    clearInterval(this.scanInterval);
    clearInterval(this.phraseInterval);
  }

  onParcelChange(event: Event) {
    const pid = (event.target as HTMLSelectElement).value;
    this.selectedParcelId.set(pid);
    const p = this.parcels().find(item => item.id === pid);
    if (p?.crop_type) {
      this.selectedCrop.set(p.crop_type);
    }
  }

  onCropChange(event: Event) {
    this.selectedCrop.set((event.target as HTMLSelectElement).value);
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) this.processFile(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.processFile(input.files[0]);
  }

  private processFile(file: File) {
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl.set(e.target?.result as string);
      this.cdr.markForCheck();
      this.startAnalysis();
    };
    reader.readAsDataURL(file);
  }

  // ── Analysis Pipeline ────────────────────────────────────────────────────────
  startAnalysis() {
    const file = this.selectedFile();
    if (!file) return;

    this.state.set('scanning');
    this.scanPhraseIndex.set(0);
    this.expertSent.set(false);

    // Rotate loading phrases every 2 seconds
    this.phraseInterval = setInterval(() => {
      this.scanPhraseIndex.update(i => (i + 1) % SCAN_PHRASES.length);
      this.cdr.markForCheck();
    }, 2000);

    const parcelId = this.selectedParcelId();
    const parcel = this.parcels().find(p => p.id === parcelId);
    const lat = parcel?.lat || parcel?.center_lat || 35.1676;
    const lng = parcel?.lng || parcel?.center_lng || 8.8365;
    const cropType = this.selectedCrop() || parcel?.crop_type || undefined;

    this.farmerApi.analyzeDisease(file, lat, lng, cropType, parcelId || undefined).subscribe({
      next: (analysisRes) => {
        clearInterval(this.phraseInterval);
        this.result.set({
          ...analysisRes,
          confidence: analysisRes.vision?.confidence ?? analysisRes.confidence,
          disease: analysisRes.vision?.disease || analysisRes.disease,
          urgency: analysisRes.decision?.urgency || analysisRes.urgency,
          recommendation_fr: analysisRes.decision?.recommendation_fr || analysisRes.recommendation_fr,
          recommendation_darija: analysisRes.decision?.recommendation_darija || analysisRes.recommendation_darija,
          explanation_fr: analysisRes.decision?.explanation_fr || analysisRes.explanation_fr,
          explanation_darija: analysisRes.decision?.explanation_darija || analysisRes.explanation_darija,
          actions: analysisRes.decision?.actions || analysisRes.actions || [],
          recommended_products: analysisRes.decision?.recommended_products || analysisRes.recommended_products || [],
          // Trilingual names resolved by the backend NameDictionary
          name_fr: analysisRes.name_fr || analysisRes.vision?.name_fr,
          name_ar: analysisRes.name_ar || analysisRes.disease_name_ar || analysisRes.vision?.name_ar,
          name_lat: analysisRes.name_lat || analysisRes.disease_name_lat || analysisRes.vision?.name_lat,
          escalation_message: analysisRes.escalation_message || analysisRes.vision?.escalation_message,
        });
        this.savedDetectionId.set(analysisRes.detection_id || analysisRes.id || null);

        // Animate gauge
        const score = analysisRes.vision?.confidence ?? analysisRes.confidence ?? 0;
        const target = 283 - (score * 283);
        this.gaugeOffset.set(283);
        setTimeout(() => {
          this.gaugeOffset.set(target);
          this.cdr.markForCheck();
        }, 300);

        this.state.set('result');
        this.loadHistory();
      },
      error: () => {
        clearInterval(this.phraseInterval);
        this.notifs.showError("Le microservice IA n'a pas pu analyser l'image.");
        this.resetDiagnostic();
      }
    });
  }

  // ── Confidence Helpers ───────────────────────────────────────────────────────
  getConfidenceScore(): number {
    const r = this.result();
    return Math.round((r?.vision?.confidence ?? r?.confidence ?? 0) * 100);
  }

  getConfidenceColor(): string {
    const r = this.result();
    const pct = this.getConfidenceScore();
    if (r?.vision?.requires_expert_validation && pct >= 70) return 'var(--warning, #f59e0b)';
    if (pct >= 70) return 'var(--success)';
    if (pct >= 40) return 'var(--warning)';
    return 'var(--error)';
  }

  getConfidenceLabel(): string {
    const r = this.result();
    const pct = this.getConfidenceScore();
    if (r?.vision?.requires_expert_validation) {
      return pct >= 70
        ? 'Alerte phytosanitaire — confirmation expert requise'
        : 'Confiance insuffisante — escalade expert';
    }
    if (pct >= 70) return 'Confiance élevée';
    if (pct >= 40) return 'Confiance modérée';
    return 'Confiance faible — consultez un expert';
  }

  getSeverityClass(): string {
    const sev = this.result()?.decision?.urgency || this.result()?.urgency || '';
    if (sev === 'CRITICAL' || sev === 'HIGH') return 'badge--danger';
    if (sev === 'MEDIUM') return 'badge--warning';
    return 'badge--info';
  }

  getSeverityLabel(): string {
    const sev = this.result()?.decision?.urgency || this.result()?.urgency || '';
    const m: Record<string, string> = { CRITICAL: '🚨 CRITIQUE', HIGH: '🔴 ÉLEVÉ', MEDIUM: '🟡 MODÉRÉ', LOW: '🟢 FAIBLE' };
    return m[sev] || sev;
  }

  // ── Recommendations Parsed ───────────────────────────────────────────────────
  getRecommendationSteps(): string[] {
    const actions = this.result()?.decision?.actions || this.result()?.actions;
    if (Array.isArray(actions) && actions.length > 0) return actions;
    const raw = this.result()?.decision?.recommendation_fr || this.result()?.recommendation_fr || '';
    if (!raw) return [];
    return raw.split(/[.\n]/).map((s: string) => s.trim()).filter((s: string) => s.length > 8).slice(0, 5);
  }

  getRecommendedProducts(): any[] {
    return this.result()?.decision?.recommended_products || this.result()?.recommended_products || this.result()?.treatment_products || [];
  }

  getStepIcon(index: number): string {
    const icons = ['lucideCheck', 'lucideDroplets', 'lucideFlaskConical', 'lucideShieldAlert', 'lucideArrowRight'];
    return icons[index % icons.length];
  }

  // ── Expert Request ───────────────────────────────────────────────────────────
  requestExpertValidation() {
    const id = this.savedDetectionId();
    if (!id) return;
    this.isSubmitting.set(true);
    const expertId = this.selectedExpertId() || undefined;
    this.farmerApi.requestExpertValidation(id, expertId).subscribe({
      next: () => {
        const expertName = this.certifiedExperts().find(e => e.id === expertId)?.name || 'le premier expert disponible';
        this.notifs.showSuccess(`Demande envoyée à ${expertName} !`);
        this.expertSent.set(true);
        this.isSubmitting.set(false);
      },
      error: () => {
        this.notifs.showError('Erreur lors de la demande.');
        this.isSubmitting.set(false);
      }
    });
  }

  // ── Parcel Link ──────────────────────────────────────────────────────────────
  linkToParcel() {
    const id = this.savedDetectionId();
    const parcelId = this.selectedParcelId();
    if (!id || !parcelId) return;
    this.isLinking.set(true);
    this.farmerApi.linkDetectionToParcel(id, parcelId).subscribe({
      next: () => { this.notifs.showSuccess('Diagnostic lié à la parcelle !'); this.isLinking.set(false); },
      error: () => { this.notifs.showError('Erreur de liaison.'); this.isLinking.set(false); }
    });
  }

  // ── Order Treatment ──────────────────────────────────────────────────────────
  orderTreatment() {
    const r = this.result();
    if (!r?.treatment_products?.length) return;
    this.isOrdering.set(true);
    const parcelId = this.selectedParcelId();
    const parcel = this.parcels().find(p => p.id === parcelId);
    const lat = parcel?.lat || 35.1676;
    const lng = parcel?.lng || 8.8365;

    this.farmerApi.fetchSuppliers(lat, lng).subscribe({
      next: (suppliers) => {
        if (!suppliers.length) {
          this.notifs.showError('Aucun fournisseur disponible dans votre zone.');
          this.isOrdering.set(false);
          return;
        }
        this.farmerApi.createOrder({
          supplier_id: suppliers[0].id,
          parcel_id: parcelId,
          items: [{ product_name: r.treatment_products[0].name, quantity: 1, estimated_price: r.treatment_products[0].price }]
        }).subscribe({
          next: () => { this.notifs.showSuccess('Commande envoyée au fournisseur !'); this.isOrdering.set(false); },
          error: () => { this.notifs.showError('Erreur lors de la commande.'); this.isOrdering.set(false); }
        });
      },
      error: () => { this.notifs.showError('Impossible de contacter les fournisseurs.'); this.isOrdering.set(false); }
    });
  }

  // ── History ──────────────────────────────────────────────────────────────────
  loadHistory() {
    this.isLoadingHistory.set(true);
    this.farmerApi.fetchMyDetections().subscribe({
      next: (res: any) => {
        // Handle both paginated { items } and plain array responses
        const data = Array.isArray(res) ? res : (res?.items || res?.data || []);
        // Limit to last 7 days of results
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const recent = data.filter((d: any) => new Date(d.created_at) >= cutoff);
        this.history.set(recent.length ? recent : data.slice(0, 7));
        this.isLoadingHistory.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.isLoadingHistory.set(false)
    });
  }

  openHistoryItem(item: any) {
    this.result.set({
      ...item,
      vision: { disease: item.disease_name, confidence: item.confidence_score, requires_expert_validation: item.requires_expert_validation },
      decision: { urgency: item.urgency, recommendation_fr: item.recommendation_fr, recommendation_darija: item.recommendation_darija },
    });
    this.savedDetectionId.set(item.id);
    this.previewUrl.set(item.photo_url);
    const score = item.confidence_score ?? 0;
    this.gaugeOffset.set(283 - (score * 283));
    this.state.set('result');
  }

  resetDiagnostic() {
    this.state.set('idle');
    this.previewUrl.set(null);
    this.selectedFile.set(null);
    this.result.set(null);
    this.gaugeOffset.set(283);
    this.savedDetectionId.set(null);
    this.expertSent.set(false);
    if (this.cameraInput) this.cameraInput.nativeElement.value = '';
    if (this.galleryInput) this.galleryInput.nativeElement.value = '';
    this.loadHistory();
  }
}
