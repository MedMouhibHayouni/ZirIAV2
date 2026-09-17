import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers, lucideSearch, lucideFilter, lucideCheckCircle,
  lucideXCircle, lucideTrash2, lucideLoader, lucideChevronLeft,
  lucideChevronRight, lucideClock, lucideEye, lucideShieldCheck,
  lucideShieldAlert, lucideX, lucideActivity, lucideShoppingCart, lucideBriefcase,
  lucideAlertTriangle, lucideUserPlus, lucideCrown, lucideBanknote, lucideHistory,
  lucideShield, lucideBan, lucideRefreshCw, lucideCalendar, lucidePhone,
  lucideMapPin, lucideWallet, lucideFileText, lucidePackage,
} from '@ng-icons/lucide';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  governorate: string;
  verified: boolean;
  is_banned: boolean;
  plan?: string;
  created_at: string;
  phone?: string;
  activity_type?: string;
  expert_type?: string;
  _approving?: boolean;
  _rejecting?: boolean;
  _animating?: boolean;
}

const TUNISIA_GOVERNORATES = [
  'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
  'Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul',
  'Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan',
];

const ROLES = ['FARMER','B2B_BUYER','SUPPLIER','DRIVER','WORKER','EXPERT','LAND_OWNER','EQUIP_OWNER','ADMIN','FARMER_AMBASSADOR','COOP_PRESIDENT'];
const EXPERT_TYPES = ['PHYTOPATHOLOGIST','AGRONOMIST','HYDRAULIC_ENGINEER','HYDROGEOLOGIST','ZOOTECHNICIAN','VETERINARY_EPIDEMIOLOGIST'];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({
    lucideUsers, lucideSearch, lucideFilter, lucideCheckCircle,
    lucideXCircle, lucideTrash2, lucideLoader, lucideChevronLeft,
    lucideChevronRight, lucideClock, lucideEye, lucideShieldCheck,
    lucideShieldAlert, lucideX, lucideActivity, lucideShoppingCart, lucideBriefcase,
    lucideAlertTriangle, lucideUserPlus, lucideCrown, lucideBanknote, lucideHistory,
    lucideShield, lucideBan, lucideRefreshCw, lucideCalendar, lucidePhone,
    lucideMapPin, lucideWallet, lucideFileText, lucidePackage,
  })],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  // Tabs
  activeTab = signal<'ALL' | 'PENDING'>('ALL');

  // State
  users = signal<User[]>([]);
  pendingUsers = signal<User[]>([]);
  total = signal(0);
  isLoading = signal(true);

  // Drawer
  selectedUser = signal<any>(null);
  isLoadingDetails = signal(false);
  paymentHistory = signal<any>(null);
  isLoadingHistory = signal(false);
  drawerTab = signal<'PROFILE' | 'PAYMENTS' | 'ACTIONS'>('PROFILE');

  // Add User Modal
  showAddModal = signal(false);
  isSavingUser = signal(false);
  newUser = {
    name: '', email: '', phone: '', governorate: '',
    role: 'EXPERT', expert_type: '', activity_type: '', planId: '',
  };

  // Filters
  page = 1;
  limit = 15;
  roleFilter = '';
  govFilter = '';
  statusFilter = '';
  planFilter = '';
  searchQuery = '';

  readonly governorates = TUNISIA_GOVERNORATES;
  readonly roles = ROLES;
  readonly expertTypes = EXPERT_TYPES;

  get totalPages() { return Math.ceil(this.total() / this.limit); }

  ngOnInit() {
    this.loadUsers();
    this.loadPendingVerifications();
  }

  setTab(tab: 'ALL' | 'PENDING') {
    this.activeTab.set(tab);
    if (tab === 'PENDING') this.loadPendingVerifications();
  }

  loadPendingVerifications() {
    this.http.get<User[]>(`${environment.apiUrl}/admin/users/pending-verification`).subscribe({
      next: (res) => { this.pendingUsers.set(res || []); this.cdr.markForCheck(); },
    });
  }

  loadUsers() {
    this.isLoading.set(true);
    const params = new URLSearchParams({ page: String(this.page), limit: String(this.limit) });
    if (this.roleFilter) params.set('role', this.roleFilter);
    if (this.govFilter) params.set('governorate', this.govFilter);
    if (this.statusFilter) params.set('status', this.statusFilter);
    if (this.planFilter) params.set('plan', this.planFilter);
    if (this.searchQuery) params.set('search', this.searchQuery);
    this.http.get<any>(`${environment.apiUrl}/admin/users?${params}`).subscribe({
      next: (res) => { this.users.set(res.items ?? []); this.total.set(res.total ?? 0); this.isLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.isLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  applyFilters() { this.page = 1; this.loadUsers(); }
  clearFilters() { this.roleFilter = ''; this.govFilter = ''; this.statusFilter = ''; this.planFilter = ''; this.searchQuery = ''; this.page = 1; this.loadUsers(); }
  prevPage() { if (this.page > 1) { this.page--; this.loadUsers(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.loadUsers(); } }

  approveUser(user: any) {
    user._approving = true;
    this.http.patch(`${environment.apiUrl}/admin/users/${user.id}/verify`, { approved: true }).subscribe({
      next: () => {
        user._animating = true;
        setTimeout(() => { this.pendingUsers.update(list => list.filter(x => x.id !== user.id)); this.loadUsers(); this.cdr.markForCheck(); }, 400);
      },
      error: () => { user._approving = false; this.cdr.markForCheck(); }
    });
  }

  rejectUser(user: any) {
    user._rejecting = true;
    this.http.patch(`${environment.apiUrl}/admin/users/${user.id}/verify`, { approved: false }).subscribe({
      next: () => {
        user._animating = true;
        setTimeout(() => { this.pendingUsers.update(list => list.filter(x => x.id !== user.id)); this.cdr.markForCheck(); }, 400);
      },
      error: () => { user._rejecting = false; this.cdr.markForCheck(); }
    });
  }

  openUserDrawer(id: string) {
    this.selectedUser.set({ id });
    this.isLoadingDetails.set(true);
    this.drawerTab.set('PROFILE');
    this.paymentHistory.set(null);
    this.http.get<any>(`${environment.apiUrl}/admin/users/${id}`).subscribe({
      next: (res) => { this.selectedUser.set(res); this.isLoadingDetails.set(false); this.cdr.markForCheck(); },
      error: () => { this.isLoadingDetails.set(false); this.closeUserDrawer(); this.cdr.markForCheck(); }
    });
  }

  loadPaymentHistory() {
    const user = this.selectedUser();
    if (!user?.user?.id || this.paymentHistory()) return;
    this.isLoadingHistory.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/users/${user.user.id}/payment-history`).subscribe({
      next: (res) => { this.paymentHistory.set(res); this.isLoadingHistory.set(false); this.cdr.markForCheck(); },
      error: () => { this.isLoadingHistory.set(false); this.cdr.markForCheck(); }
    });
  }

  setDrawerTab(tab: 'PROFILE' | 'PAYMENTS' | 'ACTIONS') {
    this.drawerTab.set(tab);
    if (tab === 'PAYMENTS') this.loadPaymentHistory();
  }

  closeUserDrawer() { this.selectedUser.set(null); this.paymentHistory.set(null); }

  changeUserPlan(planId: string) {
    const user = this.selectedUser();
    if (!user || !planId) return;
    this.http.patch(`${environment.apiUrl}/admin/users/${user.user.id}/plan`, { planId }).subscribe({
      next: () => this.openUserDrawer(user.user.id)
    });
  }

  suspendUser(id: string) {
    if (!confirm('Suspendre cet utilisateur ? Il sera notifié.')) return;
    this.http.post(`${environment.apiUrl}/admin/users/${id}/suspend`, {}).subscribe({
      next: () => { this.loadUsers(); this.closeUserDrawer(); }
    });
  }

  banUser(id: string) {
    if (!confirm('⚠️ BANNIR DÉFINITIVEMENT cet utilisateur ?\n\nCela annulera ses abonnements et désactivera ses annonces. Cette action est sévère et irréversible.')) return;
    const reason = prompt('Raison du bannissement (optionnel) :') || 'Violation des CGU';
    this.http.post(`${environment.apiUrl}/admin/users/${id}/ban`, { reason }).subscribe({
      next: () => { this.loadUsers(); this.closeUserDrawer(); }
    });
  }

  deleteUser(id: string) {
    if (!confirm('Supprimer définitivement cet utilisateur ? Cette action est irréversible.')) return;
    this.http.delete(`${environment.apiUrl}/admin/users/${id}`).subscribe({
      next: () => { this.users.update(u => u.filter(x => x.id !== id)); this.total.update(t => t - 1); this.closeUserDrawer(); }
    });
  }

  // Add User Modal
  openAddModal() { this.showAddModal.set(true); }
  closeAddModal() { this.showAddModal.set(false); this.resetNewUser(); }
  resetNewUser() { Object.assign(this.newUser, { name: '', email: '', phone: '', governorate: '', role: 'EXPERT', expert_type: '', activity_type: '', planId: '' }); }

  submitNewUser() {
    if (!this.newUser.name || !this.newUser.email) return;
    this.isSavingUser.set(true);
    this.http.post(`${environment.apiUrl}/admin/users`, this.newUser).subscribe({
      next: () => { this.isSavingUser.set(false); this.closeAddModal(); this.loadUsers(); this.cdr.markForCheck(); },
      error: () => { this.isSavingUser.set(false); this.cdr.markForCheck(); }
    });
  }

  // Helpers
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      FARMER: 'Agriculteur', B2B_BUYER: 'Acheteur B2B', SUPPLIER: 'Fournisseur',
      DRIVER: 'Chauffeur', WORKER: 'Ouvrier', EXPERT: 'Expert',
      LAND_OWNER: 'Propriétaire', EQUIP_OWNER: 'Équipement', ADMIN: 'Administrateur',
      FARMER_AMBASSADOR: 'Ambassadeur', COOP_PRESIDENT: 'SMSA',
    };
    return labels[role] ?? role;
  }

  getRoleEmoji(role: string): string {
    const emojis: Record<string, string> = {
      FARMER: '🌾', B2B_BUYER: '🏭', SUPPLIER: '📦', DRIVER: '🚚', WORKER: '👷',
      EXPERT: '🔬', LAND_OWNER: '🗺️', EQUIP_OWNER: '🚜', ADMIN: '👑',
      FARMER_AMBASSADOR: '🌍', COOP_PRESIDENT: '🏢',
    };
    return emojis[role] ?? '👤';
  }

  getRoleColor(role: string): string {
    const map: Record<string, string> = { ADMIN: 'badge-red', EXPERT: 'badge-blue', FARMER: 'badge-green', B2B_BUYER: 'badge-purple', FARMER_AMBASSADOR: 'badge-amber', SUPPLIER: 'badge-teal' };
    return map[role] ?? 'badge-gray';
  }

  getPlanLabel(plan: string | undefined | null): string {
    const m: Record<string, string> = { FREE: '🌱 Gratuit', STARTER: '⚡ Starter', PRO: '👑 Pro', BUSINESS: '💎 Business' };
    return m[plan?.toUpperCase() ?? ''] ?? (plan || 'Aucun');
  }

  getPlanColor(plan: string | undefined | null): string {
    const m: Record<string, string> = { FREE: '#64748b', STARTER: '#f59e0b', PRO: '#10b981', BUSINESS: '#8b5cf6' };
    return m[plan?.toUpperCase() ?? ''] ?? '#64748b';
  }

  getExpertTypeLabel(t: string): string {
    const m: Record<string, string> = {
      PHYTOPATHOLOGIST: 'Phytopathologiste', AGRONOMIST: 'Agronome',
      HYDRAULIC_ENGINEER: 'Ing. Hydraulique', HYDROGEOLOGIST: 'Hydrogéologue',
      ZOOTECHNICIAN: 'Zootechnicien', VETERINARY_EPIDEMIOLOGIST: 'Vétérinaire',
    };
    return m[t] ?? t;
  }
}
