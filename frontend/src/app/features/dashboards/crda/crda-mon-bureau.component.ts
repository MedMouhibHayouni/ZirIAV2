import { Component, ChangeDetectionStrategy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2, lucideUsers, lucideUserPlus, lucidePencil, lucideTrash2,
  lucideX, lucideCheck, lucideShield, lucideEye, lucideMail, lucidePhone,
  lucideMapPin, lucideBriefcase, lucideSave, lucideRotateCcw
} from '@ng-icons/lucide';

interface OfficeMember {
  id: string;
  userId: string;
  officeRole: 'DIRECTOR' | 'AGENT' | 'VIEWER';
  isActive: boolean;
  user?: { id: string; name: string; email: string; phone: string };
}

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  officeRole: 'DIRECTOR' | 'AGENT' | 'VIEWER';
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DIRECTOR: { label: 'Délégué Régional', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  AGENT:    { label: 'Ingénieur CRDA', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  VIEWER:   { label: 'Stagiaire/Observateur', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
};

@Component({
  selector: 'app-crda-mon-bureau',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({
    lucideBuilding2, lucideUsers, lucideUserPlus, lucidePencil, lucideTrash2,
    lucideX, lucideCheck, lucideShield, lucideEye, lucideMail, lucidePhone,
    lucideMapPin, lucideBriefcase, lucideSave, lucideRotateCcw
  })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .inst-page { padding: 24px; min-height: 100vh; background: var(--bg-main); }
    .inst-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .inst-header__left { display: flex; align-items: center; gap: 12px; }
    .inst-header__icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border); }
    .inst-header__title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
    .inst-header__sub { font-size: 0.78rem; color: var(--text-muted); }
    .inst-btn { padding: 8px 16px; border-radius: 10px; font-size: 0.82rem; font-weight: 600; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.2s; }
    .inst-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .inst-btn--primary { background: var(--zir-violet); color: #fff; }
    .inst-btn--danger { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }
    .inst-btn--ghost { background: transparent; color: var(--text-muted); }
    .inst-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; }
    .inst-modal-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
    .inst-modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; max-width: 520px; width: 100%; padding: 24px; }
    .inst-modal__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .inst-modal__title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .inst-field { margin-bottom: 16px; }
    .inst-field label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .inst-field input,
    .inst-field select { width: 100%; padding: 10px 14px; border-radius: 10px; font-size: 0.85rem; background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-primary); outline: none; }
    .inst-field input:focus,
    .inst-field select:focus { border-color: var(--zir-violet); }
    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
    .status-pill__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .role-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
    .role-chip:hover { opacity: 0.85; }
    .role-chip--active { border-color: currentColor; }
    .members-table { width: 100%; border-collapse: collapse; }
    .members-table th { text-align: left; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px; border-bottom: 1px solid var(--border); }
    .members-table td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--text-primary); vertical-align: middle; }
    .members-table tr:last-child td { border-bottom: none; }
    .member-name { font-weight: 600; }
    .member-email { font-size: 0.78rem; color: var(--text-muted); font-family: monospace; }
    .member-phone { font-size: 0.78rem; color: var(--text-muted); }
    .actions-cell { display: flex; gap: 4px; }
    .sk { display: block; border-radius: 8px; animation: sk-pulse 1.5s ease-in-out infinite; }
    .sk--text { height: 14px; width: 120px; }
    .sk--text-sm { height: 10px; width: 80px; }
    .sk--row { height: 52px; width: 100%; margin-bottom: 8px; }
    @keyframes sk-pulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.3; } }
    .office-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .office-info-item p:first-child { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .office-info-item p:last-child { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
    .member-count { font-size: 2rem; font-weight: 700; color: var(--zir-violet); }
    .confirm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 10px; font-size: 0.82rem; font-weight: 600; z-index: 100; animation: toast-in 0.3s ease-out; }
    .toast--success { background: var(--zir-violet); color: #fff; }
    .toast--error { background: #ef4444; color: #fff; }
    @keyframes toast-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `],
  template: `
    <div class="inst-page">
      <!-- Header -->
      <div class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon">
            <ng-icon name="lucideBuilding2" size="20" style="color: var(--zir-violet)"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Mon Bureau & Équipe Technique CRDA</h1>
            <p class="inst-header__sub">Commissariat Régional au Développement Agricole — Vulgarisation, périmètres & ressources</p>
          </div>
        </div>
        @if (isDirector()) {
          <button class="inst-btn inst-btn--primary" (click)="openAddModal()">
            <ng-icon name="lucideUserPlus" size="14"></ng-icon>
            Ajouter un membre
          </button>
        }
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;">
        <!-- Office Info Card -->
        <div class="inst-card">
          @if (loading()) {
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="sk sk--text"></div>
              <div class="sk sk--text-sm"></div>
              <div style="height: 12px"></div>
              <div class="sk sk--text"></div>
              <div class="sk sk--text-sm"></div>
              <div style="height: 12px"></div>
              <div class="sk sk--text"></div>
              <div class="sk sk--text-sm"></div>
            </div>
          } @else {
            <h3 style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); margin-bottom: 16px;">
              Fiche de la Délégation CRDA
            </h3>
            <div class="office-info-grid">
              <div class="office-info-item">
                <p>Délégation</p>
                <p>{{ officeName() || 'CRDA Régional' }}</p>
              </div>
              <div class="office-info-item">
                <p>Gouvernorat</p>
                <p>{{ governorate() || '—' }}</p>
              </div>
              <div class="office-info-item">
                <p>Statut</p>
                <span class="status-pill" style="color: var(--zir-violet); background: rgba(139,92,246,0.12);">
                  <span class="status-pill__dot"></span>
                  Actif — Guichet Unique
                </span>
              </div>
              <div class="office-info-item">
                <p>Membres actifs</p>
                <div class="member-count">{{ activeMemberCount() }}</div>
              </div>
            </div>
          }
        </div>

        <!-- Members Table -->
        <div class="inst-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">
              Membres et Officiers Régionaux
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);">{{ members().length }} membre(s)</span>
          </div>

          @if (loading()) {
            <div>
              @for (i of [1,2,3]; track i) {
                <div class="sk sk--row"></div>
              }
            </div>
          } @else {
            <table class="members-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Contact</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (member of members(); track member.id) {
                  <tr>
                    <td>
                      <div class="member-name">{{ member.user?.name || 'Agent CRDA' }}</div>
                    </td>
                    <td>
                      <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span class="member-email">{{ member.user?.email || '—' }}</span>
                        <span class="member-phone">{{ member.user?.phone || '—' }}</span>
                      </div>
                    </td>
                    <td>
                      @if (isDirector() && !isSelf(member)) {
                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                          @for (entry of roleEntries; track entry.key) {
                            <span
                              class="role-chip"
                              [class.role-chip--active]="member.officeRole === entry.key"
                              [style.background]="entry.config.bg"
                              [style.color]="entry.config.color"
                              (click)="changeRole(member, entry.key)">
                              @if (entry.key === 'DIRECTOR') {
                                <ng-icon name="lucideShield" size="10"></ng-icon>
                              } @else if (entry.key === 'AGENT') {
                                <ng-icon name="lucideBriefcase" size="10"></ng-icon>
                              } @else {
                                <ng-icon name="lucideEye" size="10"></ng-icon>
                              }
                              {{ entry.config.label }}
                            </span>
                          }
                        </div>
                      } @else {
                        <span
                          class="role-chip role-chip--active"
                          [style.background]="getRoleConfig(member.officeRole).bg"
                          [style.color]="getRoleConfig(member.officeRole).color">
                          @if (member.officeRole === 'DIRECTOR') {
                            <ng-icon name="lucideShield" size="10"></ng-icon>
                          } @else if (member.officeRole === 'AGENT') {
                            <ng-icon name="lucideBriefcase" size="10"></ng-icon>
                          } @else {
                            <ng-icon name="lucideEye" size="10"></ng-icon>
                          }
                          {{ getRoleConfig(member.officeRole).label }}
                        </span>
                      }
                    </td>
                    <td>
                      <span class="status-pill" [style.color]="member.isActive ? 'var(--zir-violet)' : 'var(--text-muted)'">
                        <span class="status-pill__dot"></span>
                        {{ member.isActive ? 'Actif' : 'Inactif' }}
                      </span>
                    </td>
                    <td>
                      <div class="actions-cell" style="justify-content: flex-end;">
                        @if (isDirector() && !isSelf(member)) {
                          <button class="inst-btn inst-btn--ghost" (click)="toggleActive(member)"
                                  [title]="member.isActive ? 'Désactiver' : 'Activer'">
                            @if (member.isActive) {
                              <ng-icon name="lucideEye" size="14"></ng-icon>
                            } @else {
                              <ng-icon name="lucideRotateCcw" size="14"></ng-icon>
                            }
                          </button>
                          <button class="inst-btn inst-btn--ghost" (click)="openEditModal(member)">
                            <ng-icon name="lucidePencil" size="14"></ng-icon>
                          </button>
                          <button class="inst-btn inst-btn--danger" (click)="confirmDelete(member)">
                            <ng-icon name="lucideTrash2" size="14"></ng-icon>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.85rem;">
                      Aucun membre trouvé.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <!-- Add/Edit Member Modal -->
      @if (showModal()) {
        <div class="inst-modal-backdrop" (click)="closeModal()">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal__header">
              <h2 class="inst-modal__title">{{ editingMember() ? 'Modifier le membre' : 'Ajouter un membre' }}</h2>
              <button class="inst-btn inst-btn--ghost" (click)="closeModal()">
                <ng-icon name="lucideX" size="18"></ng-icon>
              </button>
            </div>

            <div class="inst-field">
              <label for="member-name">Nom complet</label>
              <input id="member-name" type="text" [(ngModel)]="form().name" placeholder="Nom et prénom" />
            </div>

            <div class="inst-field">
              <label for="member-email">Email</label>
              <input id="member-email" type="email" [(ngModel)]="form().email" placeholder="email@crda.agr.tn" />
            </div>

            <div class="inst-field">
              <label for="member-phone">Téléphone</label>
              <input id="member-phone" type="tel" [(ngModel)]="form().phone" placeholder="+216 XX XXX XXX" />
            </div>

            <div class="inst-field">
              <label for="member-role">Rôle</label>
              <select id="member-role" [(ngModel)]="form().officeRole">
                @for (entry of roleEntries; track entry.key) {
                  <option [value]="entry.key">{{ entry.config.label }}</option>
                }
              </select>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
              <button class="inst-btn inst-btn--ghost" (click)="closeModal()">Annuler</button>
              <button class="inst-btn inst-btn--primary" (click)="submitMember()" [disabled]="submitting()">
                @if (submitting()) {
                  <span class="sk sk--text" style="width: 60px; height: 12px;"></span>
                } @else {
                  <ng-icon name="lucideSave" size="14"></ng-icon>
                  {{ editingMember() ? 'Enregistrer' : 'Ajouter' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="inst-modal-backdrop" (click)="closeDeleteModal()">
          <div class="inst-modal" (click)="$event.stopPropagation()" style="max-width: 400px;">
            <div class="inst-modal__header">
              <h2 class="inst-modal__title">Confirmer la suppression</h2>
              <button class="inst-btn inst-btn--ghost" (click)="closeDeleteModal()">
                <ng-icon name="lucideX" size="18"></ng-icon>
              </button>
            </div>

            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
              Êtes-vous sûr de vouloir retirer <strong style="color: var(--text-primary);">{{ deletingMember()?.user?.name }}</strong> du bureau ?
              Cette action est irréversible.
            </p>

            <div class="confirm-actions">
              <button class="inst-btn inst-btn--ghost" (click)="closeDeleteModal()">Annuler</button>
              <button class="inst-btn inst-btn--danger" (click)="deleteMember()" [disabled]="submitting()">
                <ng-icon name="lucideTrash2" size="14"></ng-icon>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Toast -->
      @if (toastMessage()) {
        <div class="toast" [ngClass]="toastType() === 'success' ? 'toast--success' : 'toast--error'">
          {{ toastMessage() }}
        </div>
      }
    </div>
  `
})
export class CrdaMonBureauComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private apiUrl = environment.apiUrl;

  officeName = signal<string | null>(null);
  governorate = signal<string | null>(null);
  members = signal<OfficeMember[]>([]);
  loading = signal(true);
  showModal = signal(false);
  showDeleteModal = signal(false);
  editingMember = signal<OfficeMember | null>(null);
  deletingMember = signal<OfficeMember | null>(null);
  submitting = signal(false);
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  form = signal<MemberForm>({ name: '', email: '', phone: '', officeRole: 'AGENT' });

  roleEntries = Object.entries(ROLE_CONFIG).map(([key, config]) => ({ key, config }));

  isDirector = computed(() => {
    const user = this.authStore.currentUser() as any;
    const member = user?.institutionMember;
    return member?.officeRole === 'DIRECTOR';
  });

  activeMemberCount = computed(() => this.members().filter(m => m.isActive).length);

  ngOnInit() {
    this.loadOffice();
  }

  private getAuthHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadOffice() {
    this.loading.set(true);
    const user = this.authStore.currentUser() as any;
    const institutionId = user?.institutionMember?.institutionId;
    if (!institutionId) {
      this.loading.set(false);
      return;
    }
    this.http.get<any>(`${this.apiUrl}/institutions/offices/${institutionId}`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (res) => {
          this.officeName.set(res.name || null);
          this.governorate.set(res.governorate || null);
          this.members.set(res.members || []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  isSelf(member: OfficeMember): boolean {
    const user = this.authStore.currentUser() as any;
    return member.userId === user?.id;
  }

  getRoleConfig(role: string): { label: string; color: string; bg: string } {
    return ROLE_CONFIG[role] || { label: role, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  }

  openAddModal() {
    this.editingMember.set(null);
    this.form.set({ name: '', email: '', phone: '', officeRole: 'AGENT' });
    this.showModal.set(true);
  }

  openEditModal(member: OfficeMember) {
    this.editingMember.set(member);
    this.form.set({
      name: member.user?.name || '',
      email: member.user?.email || '',
      phone: member.user?.phone || '',
      officeRole: member.officeRole
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingMember.set(null);
  }

  submitMember() {
    const f = this.form();
    if (!f.name || !f.email) return;

    this.submitting.set(true);
    const editing = this.editingMember();
    const user = this.authStore.currentUser() as any;
    const institutionId = user?.institutionMember?.institutionId;

    if (editing) {
      this.http.patch<any>(`${this.apiUrl}/institutions/members/${editing.id}`, {
        officeRole: f.officeRole,
        isActive: true,
      }, { headers: this.getAuthHeaders() })
        .subscribe({
          next: () => {
            this.showToast('Membre mis a jour avec succes');
            this.closeModal();
            this.loadOffice();
          },
          error: () => this.showToast('Erreur lors de la mise a jour', 'error'),
          complete: () => this.submitting.set(false)
        });
    } else {
      this.http.post<any>(`${this.apiUrl}/institutions/members`, {
        institutionId,
        name: f.name,
        email: f.email,
        phone: f.phone,
        officeRole: f.officeRole,
      }, { headers: this.getAuthHeaders() })
        .subscribe({
          next: () => {
            this.showToast('Membre ajoute avec succes');
            this.closeModal();
            this.loadOffice();
          },
          error: (err) => this.showToast(err?.error?.message || "Erreur lors de l'ajout", 'error'),
          complete: () => this.submitting.set(false)
        });
    }
  }

  changeRole(member: OfficeMember, newRole: string) {
    if (member.officeRole === newRole) return;
    this.http.patch<any>(`${this.apiUrl}/institutions/members/${member.id}`,
      { officeRole: newRole },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: () => {
        this.showToast('Role modifie avec succes');
        this.loadOffice();
      },
      error: () => this.showToast('Erreur lors du changement de role', 'error')
    });
  }

  toggleActive(member: OfficeMember) {
    this.http.patch<any>(`${this.apiUrl}/institutions/members/${member.id}`,
      { isActive: !member.isActive },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: () => {
        this.showToast(member.isActive ? 'Membre desactive' : 'Membre reactive');
        this.loadOffice();
      },
      error: () => this.showToast('Erreur lors de la mise a jour du statut', 'error')
    });
  }

  confirmDelete(member: OfficeMember) {
    this.deletingMember.set(member);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deletingMember.set(null);
  }

  deleteMember() {
    const member = this.deletingMember();
    if (!member) return;

    this.submitting.set(true);
    this.http.patch<any>(`${this.apiUrl}/institutions/members/${member.id}`,
      { isActive: false },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: () => {
        this.showToast('Membre desactive du bureau');
        this.closeDeleteModal();
        this.loadOffice();
      },
      error: () => this.showToast('Erreur lors de la desactivation', 'error'),
      complete: () => this.submitting.set(false)
    });
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }
}
