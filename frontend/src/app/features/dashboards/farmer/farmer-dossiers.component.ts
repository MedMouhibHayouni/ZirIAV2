import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

interface Institution { id: string; name: string; type: string; governorate?: string; }
interface Dossier {
  id: string;
  referenceNumber: string;
  type: string;
  status: string;
  programName: string;
  requestedAmountTnd: number;
  approvedAmountTnd?: number | null;
  projectSummary?: string;
  createdAt: string;
  updatedAt: string;
  institution?: { name: string; type: string };
  documents?: { id: string; documentName: string; documentType: string; reviewStatus: string; fileUrl?: string }[];
  statusHistory?: { newStatus: string; previousStatus?: string; reason?: string; createdAt: string }[];
}

const STATUS_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  DRAFT:        { label: 'Brouillon',      color: '#94a3b8', icon: '📝' },
  SUBMITTED:    { label: 'Soumis',         color: '#3b82f6', icon: '📤' },
  UNDER_REVIEW: { label: 'En révision',    color: '#f59e0b', icon: '🔍' },
  INCOMPLETE:   { label: 'Dossier incomplet', color: '#f97316', icon: '⚠️' },
  APPROVED:     { label: 'Approuvé',       color: '#10b981', icon: '✅' },
  REJECTED:     { label: 'Rejeté',         color: '#ef4444', icon: '❌' },
  WITHDRAWN:    { label: 'Retiré',         color: '#8b5cf6', icon: '↩️' },
  CLOSED:       { label: 'Clôturé',        color: '#6b7280', icon: '🔒' },
};

@Component({
  selector: 'app-farmer-dossiers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 min-h-screen" style="background: #0f1623">

      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Mes Dossiers Institutionnels</h1>
          <p class="text-sm text-slate-400 mt-0.5">Suivi de vos demandes APIA & CRDA</p>
        </div>
        <button (click)="showNewForm.set(true)"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] shadow-lg"
                style="background: linear-gradient(135deg, #10b981, #059669)">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nouveau Dossier
        </button>
      </div>

      <!-- Stats Bar -->
      <div *ngIf="dossiers().length > 0" class="flex flex-wrap gap-3 mb-6">
        <div *ngFor="let stat of stats()" class="px-4 py-2 rounded-xl text-xs font-semibold border"
             [style.background]="stat.bg" [style.color]="stat.color" [style.borderColor]="stat.color + '40'">
          {{ stat.icon }} {{ stat.count }} {{ stat.label }}
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="space-y-4">
        <div *ngFor="let _ of [1,2,3]" class="h-36 rounded-2xl animate-pulse" style="background: rgba(255,255,255,0.05)"></div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && dossiers().length === 0 && !showNewForm()"
           class="text-center py-20 rounded-2xl border"
           style="background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.07)">
        <div class="text-6xl mb-4">🏛️</div>
        <h3 class="text-lg font-semibold text-white mb-2">Aucun dossier en cours</h3>
        <p class="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
          Soumettez une déclaration d'investissement APIA ou un projet technique CRDA pour démarrer votre suivi.
        </p>
        <button (click)="showNewForm.set(true)"
                class="px-6 py-3 rounded-xl text-sm font-semibold text-white"
                style="background: linear-gradient(135deg, #10b981, #059669)">
          + Créer mon premier dossier
        </button>
      </div>

      <!-- Dossier List -->
      <div *ngIf="!loading() && dossiers().length > 0" class="space-y-4">
        <div *ngFor="let d of dossiers()" class="rounded-2xl border overflow-hidden transition-all"
             style="background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.07)">
          <div class="p-5 cursor-pointer hover:bg-white/5" (click)="toggleDetail(d.id)">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="text-xs font-mono font-semibold text-emerald-400">{{ d.referenceNumber }}</span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                        [style.background]="(statusMeta(d.status).color) + '1a'"
                        [style.color]="statusMeta(d.status).color">
                    {{ statusMeta(d.status).icon }} {{ statusMeta(d.status).label }}
                  </span>
                </div>
                <p class="text-base font-semibold text-white">{{ d.programName }}</p>
                <p class="text-xs text-slate-400 mt-0.5">{{ d.institution?.name || d.type }} · {{ d.createdAt | date:'dd/MM/yyyy' }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-xl font-bold text-white">{{ d.requestedAmountTnd | number:'1.0-0' }}</p>
                <p class="text-xs text-slate-400">DT demandé</p>
                <p *ngIf="d.approvedAmountTnd" class="text-xs font-semibold text-emerald-400 mt-1">
                  ✓ {{ d.approvedAmountTnd | number:'1.0-0' }} DT approuvé
                </p>
              </div>
            </div>
          </div>

          <!-- Expanded detail -->
          <div *ngIf="expandedId() === d.id" class="border-t px-5 pb-5" style="border-color: rgba(255,255,255,0.06)">
            <!-- Status Timeline -->
            <div *ngIf="d.statusHistory?.length" class="mt-4 mb-4">
              <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Historique du dossier</p>
              <div class="space-y-2">
                <div *ngFor="let h of d.statusHistory; let last = last" class="flex items-start gap-3">
                  <div class="flex flex-col items-center">
                    <div class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                         [style.background]="statusMeta(h.newStatus).color"></div>
                    <div *ngIf="!last" class="w-px flex-1 my-1" style="background: rgba(255,255,255,0.1); min-height: 12px"></div>
                  </div>
                  <div>
                    <p class="text-xs font-semibold" [style.color]="statusMeta(h.newStatus).color">
                      {{ statusMeta(h.newStatus).label }}
                    </p>
                    <p *ngIf="h.reason" class="text-xs text-slate-400">{{ h.reason }}</p>
                    <p class="text-xs text-slate-500">{{ h.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Documents -->
            <div *ngIf="d.documents?.length">
              <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Pièces jointes</p>
              <div class="flex flex-wrap gap-2">
                <a *ngFor="let doc of d.documents" [href]="doc.fileUrl || '#'" target="_blank"
                   class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all hover:scale-[1.02]"
                   [style.background]="doc.reviewStatus === 'ACCEPTED' ? 'rgba(16,185,129,0.1)' : doc.reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)'"
                   [style.color]="doc.reviewStatus === 'ACCEPTED' ? '#10b981' : doc.reviewStatus === 'REJECTED' ? '#ef4444' : '#94a3b8'"
                   [style.borderColor]="doc.reviewStatus === 'ACCEPTED' ? 'rgba(16,185,129,0.3)' : doc.reviewStatus === 'REJECTED' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'">
                  📄 {{ doc.documentName }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- New Dossier Modal -->
      <div *ngIf="showNewForm()" class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background: rgba(0,0,0,0.85); backdrop-filter: blur(4px)"
           (click)="showNewForm.set(false)">
        <div class="w-full max-w-lg rounded-2xl p-6 border"
             style="background: #1a2540; border-color: rgba(255,255,255,0.12)"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-white">Nouveau Dossier</h2>
            <button (click)="showNewForm.set(false)" class="text-slate-400 hover:text-white text-lg">✕</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="submitDossier()" class="space-y-4">
            <!-- Institution -->
            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Institution</label>
              <select formControlName="institutionId"
                      class="w-full px-3 py-2.5 rounded-xl text-sm border text-white"
                      style="background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); outline: none">
                <option value="" disabled>Sélectionnez une institution</option>
                <option *ngFor="let inst of institutions()" [value]="inst.id">
                  {{ inst.name }} ({{ inst.type }})
                </option>
              </select>
            </div>

            <!-- Type -->
            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Type de dossier</label>
              <select formControlName="type"
                      class="w-full px-3 py-2.5 rounded-xl text-sm border text-white"
                      style="background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); outline: none">
                <option value="INVESTMENT">Investissement agricole (APIA)</option>
                <option value="CREDIT">Crédit agricole (APIA)</option>
                <option value="SUBSIDY_APPLICATION">Subvention agricole (CRDA)</option>
                <option value="TECHNICAL_REQUEST">Demande technique (CRDA)</option>
              </select>
            </div>

            <!-- Programme -->
            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Nom du programme</label>
              <input formControlName="programName" placeholder="ex: Programme FOSDAP 2026"
                     class="w-full px-3 py-2.5 rounded-xl text-sm border text-white placeholder-slate-500"
                     style="background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); outline: none"/>
            </div>

            <!-- Amount -->
            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Montant demandé (DT)</label>
              <input formControlName="requestedAmountTnd" type="number" min="0" placeholder="0.000"
                     class="w-full px-3 py-2.5 rounded-xl text-sm border text-white placeholder-slate-500"
                     style="background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); outline: none"/>
            </div>

            <!-- Summary -->
            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Résumé du projet (optionnel)</label>
              <textarea formControlName="projectSummary" rows="3" placeholder="Décrivez brièvement votre projet..."
                        class="w-full px-3 py-2.5 rounded-xl text-sm border text-white placeholder-slate-500 resize-none"
                        style="background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); outline: none"></textarea>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" (click)="showNewForm.set(false)"
                      class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border"
                      style="border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.04)">
                Annuler
              </button>
              <button type="submit" [disabled]="form.invalid || submitting()"
                      class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style="background: linear-gradient(135deg, #10b981, #059669)">
                {{ submitting() ? 'Envoi...' : '📤 Soumettre le dossier' }}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
})
export class FarmerDossiersComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private fb = inject(FormBuilder);

  dossiers = signal<Dossier[]>([]);
  institutions = signal<Institution[]>([]);
  loading = signal(true);
  showNewForm = signal(false);
  submitting = signal(false);
  expandedId = signal<string | null>(null);

  form = this.fb.group({
    institutionId: ['', Validators.required],
    type: ['INVESTMENT', Validators.required],
    programName: ['', [Validators.required, Validators.maxLength(150)]],
    requestedAmountTnd: [0, [Validators.required, Validators.min(1)]],
    projectSummary: [''],
  });

  statusMeta(s: string) { return STATUS_LABEL[s] || { label: s, color: '#94a3b8', icon: '📋' }; }

  stats = () => {
    const d = this.dossiers();
    const approved = d.filter(x => x.status === 'APPROVED').length;
    const pending = d.filter(x => ['SUBMITTED', 'UNDER_REVIEW'].includes(x.status)).length;
    const incomplete = d.filter(x => x.status === 'INCOMPLETE').length;
    return [
      { label: 'en cours', count: pending, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: '📤' },
      { label: 'approuvés', count: approved, color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '✅' },
      { label: 'à compléter', count: incomplete, color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: '⚠️' },
    ].filter(s => s.count > 0);
  };

  private get headers() { return { Authorization: `Bearer ${this.authStore.token()}` }; }

  ngOnInit() {
    this.loadDossiers();
    this.loadInstitutions();
  }

  loadDossiers() {
    this.http.get<Dossier[]>(`${environment.apiUrl}/dossiers/mes-dossiers`, { headers: this.headers })
      .subscribe({ next: d => { this.dossiers.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  loadInstitutions() {
    this.http.get<Institution[]>(`${environment.apiUrl}/institutions`, { headers: this.headers })
      .subscribe({ next: list => this.institutions.set(list), error: () => {} });
  }

  toggleDetail(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  submitDossier() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.http.post<Dossier>(`${environment.apiUrl}/dossiers`, this.form.value, { headers: this.headers })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showNewForm.set(false);
          this.form.reset({ type: 'INVESTMENT', requestedAmountTnd: 0 });
          this.loadDossiers();
        },
        error: () => this.submitting.set(false),
      });
  }
}
