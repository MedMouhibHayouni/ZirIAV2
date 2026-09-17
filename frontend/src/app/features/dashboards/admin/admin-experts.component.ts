import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers, lucideSearch, lucideMapPin, lucideShieldCheck,
  lucideLoader, lucideX, lucideChevronLeft, lucideChevronRight,
  lucideEye, lucideStar, lucideActivity, lucideFileText,
  lucideUserPlus, lucideRefreshCw, lucideMap, lucideGlobe,
  lucideCheckCircle, lucideXCircle, lucideAward,
} from '@ng-icons/lucide';

const TUNISIA_GOVERNORATES = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul',
  'Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan',
];

const EXPERT_TYPE_LABELS: Record<string, string> = {
  PHYTOPATHOLOGIST: 'Phytopathologiste', AGRONOMIST: 'Agronome',
  HYDRAULIC_ENGINEER: 'Ing. Hydraulique', HYDROGEOLOGIST: 'Hydrogéologue',
  ZOOTECHNICIAN: 'Zootechnicien', VETERINARY_EPIDEMIOLOGIST: 'Vétérinaire',
};

const EXPERT_TYPE_COLORS: Record<string, string> = {
  PHYTOPATHOLOGIST: '#22c55e', AGRONOMIST: '#84cc16',
  HYDRAULIC_ENGINEER: '#38bdf8', HYDROGEOLOGIST: '#818cf8',
  ZOOTECHNICIAN: '#fb923c', VETERINARY_EPIDEMIOLOGIST: '#f472b6',
};

const PLAN_COLORS: Record<string, string> = {
  FREE: '#64748b', STARTER: '#f59e0b', PRO: '#10b981', BUSINESS: '#8b5cf6',
};

@Component({
  selector: 'app-admin-experts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({
    lucideUsers, lucideSearch, lucideMapPin, lucideShieldCheck,
    lucideLoader, lucideX, lucideChevronLeft, lucideChevronRight,
    lucideEye, lucideStar, lucideActivity, lucideFileText,
    lucideUserPlus, lucideRefreshCw, lucideMap, lucideGlobe,
    lucideCheckCircle, lucideXCircle, lucideAward,
  })],
  templateUrl: './admin-experts.component.html',
  styleUrls: ['./admin-experts.component.scss'],
})
export class AdminExpertsComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  activeTab = signal<'GOVERNORATES' | 'EXPERTS' | 'AMBASSADORS'>('GOVERNORATES');
  isLoading = signal(true);
  data = signal<{ experts: any[]; ambassadors: any[]; govCoverage: any[] } | null>(null);
  searchQuery = '';

  selectedExpert = signal<any>(null);
  showExpertDrawer = signal(false);
  isLoadingExpertDetails = signal(false);

  readonly govList = TUNISIA_GOVERNORATES;
  readonly expertTypeLabels = EXPERT_TYPE_LABELS;
  readonly expertTypeColors = EXPERT_TYPE_COLORS;
  readonly planColors = PLAN_COLORS;

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/experts-ambassadors`).subscribe({
      next: (res) => { this.data.set(res); this.isLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.isLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  get filteredExperts() {
    const d = this.data();
    if (!d) return [];
    if (!this.searchQuery) return d.experts;
    const q = this.searchQuery.toLowerCase();
    return d.experts.filter((e: any) =>
      e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.governorate?.toLowerCase().includes(q)
    );
  }

  get filteredAmbassadors() {
    const d = this.data();
    if (!d) return [];
    if (!this.searchQuery) return d.ambassadors;
    const q = this.searchQuery.toLowerCase();
    return d.ambassadors.filter((a: any) =>
      a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.governorate?.toLowerCase().includes(q)
    );
  }

  getGovCoverage(gov: string) {
    const d = this.data();
    if (!d) return null;
    return d.govCoverage.find((g: any) => g.governorate === gov) || null;
  }

  getExpertTypeLabel(t: string) { return EXPERT_TYPE_LABELS[t] || t; }
  getExpertTypeColor(t: string) { return EXPERT_TYPE_COLORS[t] || '#64748b'; }
  getPlanColor(p: string) { return PLAN_COLORS[p] || '#64748b'; }

  openExpertDrawer(expert: any) {
    this.selectedExpert.set(expert);
    this.showExpertDrawer.set(true);
  }

  closeExpertDrawer() {
    this.showExpertDrawer.set(false);
    this.selectedExpert.set(null);
  }

  parseFloat(val: any): number { return typeof val === 'number' ? val : parseFloat(val || '0'); }
}
