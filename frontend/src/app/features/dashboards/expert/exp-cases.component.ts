import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle, lucideXCircle, lucideActivity, lucideFlag, lucideCpu,
  lucideUser, lucideMapPin, lucideAlertTriangle, lucideFileText, lucideChevronDown,
  lucideChevronUp, lucideExternalLink, lucideCamera, lucideRuler, lucideSprout,
  lucideClipboardList, lucideLoader, lucideCheck, lucideInfo, lucideSend,
  lucidePill, lucideDroplets, lucideSun, lucideThermometer, lucideBug
} from '@ng-icons/lucide';
import { ExpertApiService, TriageCase, ExpertFieldReport } from '../../../core/services/expert-api.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { NameTranslationService } from '../../../core/services/name-translation.service';
import { SkeletonLoaderComponent } from './shared/skeleton-loader.component';

type TriageTab = 'ai' | 'field';
type ValidationMode = 'idle' | 'correct' | 'incorrect';

@Component({
  selector: 'app-exp-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent, SkeletonLoaderComponent],
  providers: [provideIcons({
    lucideCheckCircle, lucideXCircle, lucideActivity, lucideFlag, lucideCpu,
    lucideUser, lucideMapPin, lucideAlertTriangle, lucideFileText, lucideChevronDown,
    lucideChevronUp, lucideExternalLink, lucideCamera, lucideRuler, lucideSprout,
    lucideClipboardList, lucideLoader, lucideCheck, lucideInfo, lucideSend,
    lucidePill, lucideDroplets, lucideSun, lucideThermometer, lucideBug
  })],
  templateUrl: './exp-cases.component.html',
  styleUrl: './exp-cases.component.scss'
})
export class ExpCasesComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly notifs = inject(NotificationStore);
  private readonly nameService = inject(NameTranslationService);
  private readonly cdr = inject(ChangeDetectorRef);

  activeTab = signal<TriageTab>('ai');
  cases = signal<TriageCase[]>([]);
  fieldReports = signal<ExpertFieldReport[]>([]);
  isLoadingField = signal(true);
  isLoadingCases = signal(true);
  selected = signal<TriageCase | null>(null);
  expandedId = signal<string | null>(null);

  aiCases = computed(() => {
    return [...this.cases()]
      .filter(c => c.case_type === 'AI_DIAGNOSIS')
      .sort((a, b) => this.getUrgencyScore(b) - this.getUrgencyScore(a));
  });

  validationMode = signal<ValidationMode>('idle');
  isCorrect = signal<boolean>(true);
  scientificName = '';
  arabicName = '';
  latinName = '';
  validationComments = '';
  isSubmitting = signal(false);

  prescriptionText = '';
  showPrescription = signal(false);

  aiSuggestions = computed(() => {
    const c = this.selected();
    if (!c) return [];
    const suggestions: { icon: string; text: string; color: string }[] = [];
    if (c.confidence_score && c.confidence_score < 0.5) {
      suggestions.push({ icon: 'lucideAlertTriangle', text: 'Confiance faible — vérification recommandée', color: 'var(--warning)' });
    }
    if (c.severity === 'CRITICAL' || c.severity === 'HIGH') {
      suggestions.push({ icon: 'lucideBug', text: 'Intervention rapide requise', color: 'var(--danger)' });
    }
    if (c.recommendation_fr) {
      suggestions.push({ icon: 'lucideInfo', text: c.recommendation_fr.substring(0, 80) + '...', color: 'var(--info)' });
    }
    return suggestions;
  });

  ngOnInit() {
    this.loadCases();
    this.loadFieldReports();
  }

  loadCases() {
    this.isLoadingCases.set(true);
    this.api.getPendingCases().subscribe(c => {
      this.cases.set(c);
      const selectedItem = this.selected();
      if (selectedItem && !c.find(x => x.id === selectedItem.id)) {
        this.selected.set(null);
        this.validationMode.set('idle');
      }
      this.isLoadingCases.set(false);
      this.cdr.markForCheck();
    });
  }

  loadFieldReports() {
    this.isLoadingField.set(true);
    this.api.getFieldReports().subscribe(r => {
      this.fieldReports.set(r || []);
      this.isLoadingField.set(false);
      this.cdr.markForCheck();
    });
  }

  selectCase(c: TriageCase) {
    this.selected.set(c);
    this.validationMode.set('idle');
    this.showPrescription.set(false);
    this.prescriptionText = '';
    this.scientificName = c.title || '';

    const entry = this.nameService.getTranslationDetails(c.title);
    this.arabicName = entry?.name_ar || '';
    this.latinName = entry?.name_lat || '';
    this.validationComments = '';
  }

  toggleExpand(id: string) {
    this.expandedId.update(cur => cur === id ? null : id);
  }

  setValidation(correct: boolean) {
    this.isCorrect.set(correct);
    this.validationMode.set(correct ? 'correct' : 'incorrect');
    if (correct) {
      this.scientificName = this.selected()?.title || '';
      const entry = this.nameService.getTranslationDetails(this.scientificName);
      this.arabicName = entry?.name_ar || this.arabicName || '';
      this.latinName = entry?.name_lat || this.latinName || '';
    } else {
      this.scientificName = '';
      this.arabicName = '';
      this.latinName = '';
    }
  }

  submitValidation() {
    const c = this.selected();
    if (!c) return;

    if (!this.scientificName.trim()) {
      return this.notifs.showError('Le nom scientifique est obligatoire.');
    }
    if (!this.arabicName.trim()) {
      return this.notifs.showError('Le nom en arabe tunisien est obligatoire.');
    }
    if (!this.latinName.trim()) {
      return this.notifs.showError('Le nom latin binominal est obligatoire.');
    }

    this.isSubmitting.set(true);
    this.api.validateDiagnosis(
      c.id,
      this.isCorrect(),
      this.scientificName.trim(),
      this.validationComments.trim(),
      this.arabicName.trim(),
      this.latinName.trim()
    ).subscribe({
      next: () => {
        this.notifs.showSuccess('Validation et nomenclature enregistrées avec succès !');
        this.validationMode.set('idle');
        this.scientificName = '';
        this.arabicName = '';
        this.latinName = '';
        this.validationComments = '';
        this.isSubmitting.set(false);
        this.loadCases();
      },
      error: () => {
        this.notifs.showError('Une erreur est survenue lors de la validation.');
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  sendRapidPrescription() {
    const c = this.selected();
    if (!c || !this.prescriptionText.trim()) return;

    this.api.createPrescription({
      case_id: c.id,
      farmer_id: c.farmer_id,
      content: this.prescriptionText.trim(),
      type: 'RAPID_PRESCRIPTION'
    }).subscribe({
      next: () => {
        this.notifs.showSuccess('Prescription rapide envoyée !');
        this.showPrescription.set(false);
        this.prescriptionText = '';
        this.cdr.markForCheck();
      },
      error: () => {
        this.notifs.showError('Erreur lors de l\'envoi de la prescription.');
        this.cdr.markForCheck();
      }
    });
  }

  insertSuggestion(text: string) {
    this.validationComments = this.validationComments ? this.validationComments + '\n' + text : text;
  }

  getUrgencyScore(c: TriageCase): number {
    const sevScore: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NORMAL: 0 };
    const ageHours = (Date.now() - new Date(c.created_at).getTime()) / 3600000;
    const sev = sevScore[c.severity] ?? 0;
    return sev * 100 + Math.min(ageHours, 168);
  }

  getSevLabel(sev: string): string {
    const m: Record<string, string> = { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé', CRITICAL: 'Critique' };
    return m[sev] ?? sev;
  }

  getSevIcon(sev: string): string {
    const m: Record<string, string> = { LOW: 'lucideSprout', MEDIUM: 'lucideAlertTriangle', HIGH: 'lucideBug', CRITICAL: 'lucideAlertTriangle' };
    return m[sev] ?? 'lucideInfo';
  }

  getConfidenceColor(score: number): string {
    if (score >= 0.8) return 'var(--success)';
    if (score >= 0.6) return 'var(--warning)';
    return 'var(--danger)';
  }
}
