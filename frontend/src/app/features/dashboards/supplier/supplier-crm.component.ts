import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers, lucideLoader, lucideSearch, lucideCircleDollarSign,
  lucideShoppingBag, lucideCalendar, lucideArrowRight, lucideTrendingUp,
  lucidePlus, lucideTrash2, lucidePin, lucideCheckCircle, lucideClock,
  lucideTag, lucideFileText, lucidePhone, lucideMapPin, lucideMail,
  lucideDownload, lucideEdit, lucideX, lucideArchive, lucideAlertCircle
} from '@ng-icons/lucide';
import {
  SupplierApiService,
  CrmClient,
  CrmNote,
  CrmReminder,
  CrmStats,
  SupplierOrder
} from '../../../core/services/supplier-api.service';

@Component({
  selector: 'app-supplier-crm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideUsers, lucideLoader, lucideSearch, lucideCircleDollarSign,
    lucideShoppingBag, lucideCalendar, lucideArrowRight, lucideTrendingUp,
    lucidePlus, lucideTrash2, lucidePin, lucideCheckCircle, lucideClock,
    lucideTag, lucideFileText, lucidePhone, lucideMapPin, lucideMail,
    lucideDownload, lucideEdit, lucideX, lucideArchive, lucideAlertCircle
  })],
  templateUrl: './supplier-crm.component.html',
  styleUrl: './supplier-crm.component.scss'
})
export class SupplierCrmComponent implements OnInit {
  public readonly api = inject(SupplierApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  // States
  isLoadingClients = signal(true);
  isLoadingStats = signal(true);
  clients = signal<CrmClient[]>([]);
  stats = signal<CrmStats | null>(null);
  upcomingReminders = signal<any[]>([]);

  // Filter & Search
  searchQuery = signal('');
  selectedSegment = signal('');
  selectedTagFilter = signal<string[]>([]);
  sortBy = signal('score');
  sortOrder = signal<'ASC' | 'DESC'>('DESC');
  isArchivedFilter = signal(false);

  // Selected Client Details
  selectedClient = signal<CrmClient | null>(null);
  isLoadingClientDetails = signal(false);
  clientOrders = signal<SupplierOrder[]>([]);
  clientNotes = signal<CrmNote[]>([]);
  clientReminders = signal<CrmReminder[]>([]);

  // Active Tab inside Client Drawer/Modal
  activeTab = signal<'journal' | 'reminders' | 'orders'>('journal');

  // Input states for forms
  newNoteType = signal<'NOTE' | 'APPEL' | 'VISITE' | 'RELANCE'>('NOTE');
  newNoteContent = signal('');
  
  newReminderTitle = signal('');
  newReminderDesc = signal('');
  newReminderDate = signal('');

  // Editing Client state
  isEditingClient = signal(false);
  editFullName = signal('');
  editPhone = signal('');
  editEmail = signal('');
  editCompanyName = signal('');
  editTaxId = signal('');
  editAddress = signal('');
  editGovernorate = signal('');
  editNotes = signal('');
  editTagsString = signal('');

  // All unique tags available in the clients list (computed)
  allAvailableTags = computed(() => {
    const set = new Set<string>();
    for (const c of this.clients()) {
      if (c.tags) {
        c.tags.forEach(t => set.add(t));
      }
    }
    return Array.from(set);
  });

  // Filtered Clients (handled client-side or re-fetched, let's support robust computed reactive filter)
  filteredClients = computed(() => {
    let list = this.clients();

    // 1. Search Query
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.company_name && c.company_name.toLowerCase().includes(q))
      );
    }

    // 2. Segment
    const seg = this.selectedSegment();
    if (seg) {
      list = list.filter(c => c.segment === seg);
    }

    // 3. Tags Filter (match all selected tags)
    const filterTags = this.selectedTagFilter();
    if (filterTags.length > 0) {
      list = list.filter(c => {
        if (!c.tags) return false;
        return filterTags.every(t => c.tags!.includes(t));
      });
    }

    // 4. Archive Status
    list = list.filter(c => c.is_archived === this.isArchivedFilter());

    // 5. Sorting
    const sortF = this.sortBy();
    const order = this.sortOrder();

    list = [...list].sort((a, b) => {
      let comparison = 0;
      if (sortF === 'total_spent') {
        comparison = a.total_spent_tnd - b.total_spent_tnd;
      } else if (sortF === 'last_order') {
        const dateA = a.last_order_date ? new Date(a.last_order_date).getTime() : 0;
        const dateB = b.last_order_date ? new Date(b.last_order_date).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortF === 'score') {
        comparison = a.lifetime_value_score - b.lifetime_value_score;
      } else if (sortF === 'name') {
        comparison = a.full_name.localeCompare(b.full_name);
      }
      return order === 'DESC' ? -comparison : comparison;
    });

    return list;
  });

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loadStats();
    this.loadClients();
    this.loadUpcomingReminders();
  }

  loadStats(): void {
    this.isLoadingStats.set(true);
    this.api.getCrmStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoadingStats.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingStats.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadClients(): void {
    this.isLoadingClients.set(true);
    this.api.getCrmClients({ isArchived: this.isArchivedFilter() }).subscribe({
      next: (data) => {
        this.clients.set(data);
        this.isLoadingClients.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingClients.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadUpcomingReminders(): void {
    this.api.getUpcomingReminders().subscribe({
      next: (data) => {
        this.upcomingReminders.set(data);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  selectClient(client: CrmClient): void {
    if (this.selectedClient()?.id === client.id) {
      this.closeClientDrawer();
      return;
    }

    this.selectedClient.set(client);
    this.isLoadingClientDetails.set(true);
    this.activeTab.set('journal');
    this.cdr.markForCheck();

    // Fetch details
    this.loadClientDetails(client.id);
  }

  loadClientDetails(clientId: string): void {
    this.isLoadingClientDetails.set(true);
    this.api.getClientNotes(clientId).subscribe({
      next: (notes) => {
        this.clientNotes.set(notes);
        this.checkLoadingState();
      },
      error: () => this.checkLoadingState()
    });

    this.api.getClientReminders(clientId).subscribe({
      next: (reminders) => {
        this.clientReminders.set(reminders);
        this.checkLoadingState();
      },
      error: () => this.checkLoadingState()
    });

    this.api.getClientOrders(clientId).subscribe({
      next: (orders) => {
        this.clientOrders.set(orders);
        this.checkLoadingState();
      },
      error: () => this.checkLoadingState()
    });
  }

  private checkLoadingState(): void {
    this.isLoadingClientDetails.set(false);
    this.cdr.markForCheck();
  }

  closeClientDrawer(): void {
    this.selectedClient.set(null);
    this.isEditingClient.set(false);
    this.cdr.markForCheck();
  }

  // --- TAB NAVIGATION IN DRAWER ---
  setTab(tab: 'journal' | 'reminders' | 'orders'): void {
    this.activeTab.set(tab);
    this.cdr.markForCheck();
  }

  // --- TAG FILTER TOGGLE ---
  toggleTagFilter(tag: string): void {
    const current = this.selectedTagFilter();
    if (current.includes(tag)) {
      this.selectedTagFilter.set(current.filter(t => t !== tag));
    } else {
      this.selectedTagFilter.set([...current, tag]);
    }
    this.cdr.markForCheck();
  }

  clearTagFilters(): void {
    this.selectedTagFilter.set([]);
    this.cdr.markForCheck();
  }

  // --- ACTIONS FOR NOTES (CRUD) ---
  addNote(): void {
    const client = this.selectedClient();
    if (!client || !this.newNoteContent().trim()) return;

    this.api.addNote(client.id, {
      note_type: this.newNoteType(),
      content: this.newNoteContent().trim(),
      is_pinned: false
    }).subscribe({
      next: (note) => {
        // Optimistic / clean local append
        this.clientNotes.set([note, ...this.clientNotes()]);
        this.newNoteContent.set('');
        this.cdr.markForCheck();
      },
      error: (err) => console.error(err)
    });
  }

  togglePinNote(note: CrmNote): void {
    this.api.updateNote(note.id, {
      is_pinned: !note.is_pinned
    }).subscribe({
      next: (updatedNote) => {
        this.clientNotes.set(
          this.clientNotes()
            .map(n => n.id === note.id ? updatedNote : n)
            .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
        );
        this.cdr.markForCheck();
      }
    });
  }

  deleteNote(noteId: string): void {
    if (!confirm('Voulez-vous vraiment supprimer cette note ?')) return;

    this.api.deleteNote(noteId).subscribe({
      next: () => {
        this.clientNotes.set(this.clientNotes().filter(n => n.id !== noteId));
        this.cdr.markForCheck();
      }
    });
  }

  // --- ACTIONS FOR REMINDERS (CRUD) ---
  addReminder(): void {
    const client = this.selectedClient();
    if (!client || !this.newReminderTitle().trim() || !this.newReminderDate()) return;

    this.api.addReminder(client.id, {
      title: this.newReminderTitle().trim(),
      description: this.newReminderDesc().trim(),
      reminder_date: this.newReminderDate()
    }).subscribe({
      next: (reminder) => {
        this.clientReminders.set([...this.clientReminders(), reminder].sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime()));
        this.newReminderTitle.set('');
        this.newReminderDesc.set('');
        this.newReminderDate.set('');
        this.loadUpcomingReminders();
        this.loadStats();
        this.cdr.markForCheck();
      }
    });
  }

  completeReminder(reminder: CrmReminder): void {
    this.api.completeReminder(reminder.id).subscribe({
      next: (updated) => {
        this.clientReminders.set(
          this.clientReminders().map(r => r.id === reminder.id ? updated : r)
        );
        this.loadUpcomingReminders();
        this.loadStats();
        this.cdr.markForCheck();
      }
    });
  }

  deleteReminder(reminderId: string): void {
    if (!confirm('Supprimer ce rappel ?')) return;

    this.api.deleteReminder(reminderId).subscribe({
      next: () => {
        this.clientReminders.set(this.clientReminders().filter(r => r.id !== reminderId));
        this.loadUpcomingReminders();
        this.loadStats();
        this.cdr.markForCheck();
      }
    });
  }

  // --- CLIENT EDIT MODAL / FORM ---
  startEditClient(): void {
    const c = this.selectedClient();
    if (!c) return;

    this.editFullName.set(c.full_name || '');
    this.editPhone.set(c.phone || '');
    this.editEmail.set(c.email || '');
    this.editCompanyName.set(c.company_name || '');
    this.editTaxId.set(c.tax_id || '');
    this.editAddress.set(c.address || '');
    this.editGovernorate.set(c.governorate || '');
    this.editNotes.set(c.notes || '');
    this.editTagsString.set(c.tags ? c.tags.join(', ') : '');
    
    this.isEditingClient.set(true);
    this.cdr.markForCheck();
  }

  cancelEditClient(): void {
    this.isEditingClient.set(false);
    this.cdr.markForCheck();
  }

  saveClient(): void {
    const c = this.selectedClient();
    if (!c) return;

    // Parse tags from comma separated string
    const tags = this.editTagsString()
      .split(',')
      .map(t => t.trim())
      .filter(t => !!t);

    const dto = {
      full_name: this.editFullName(),
      phone: this.editPhone(),
      email: this.editEmail(),
      company_name: this.editCompanyName(),
      tax_id: this.editTaxId(),
      address: this.editAddress(),
      governorate: this.editGovernorate(),
      notes: this.editNotes(),
      tags
    };

    this.api.updateCrmClient(c.id, dto).subscribe({
      next: (updatedClient) => {
        // Sync lists
        this.selectedClient.set(updatedClient);
        this.clients.set(this.clients().map(item => item.id === c.id ? updatedClient : item));
        this.isEditingClient.set(false);
        this.loadStats();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error updating client', err)
    });
  }

  archiveClient(): void {
    const c = this.selectedClient();
    if (!c) return;

    if (!confirm(`Voulez-vous vraiment archiver le client ${c.full_name} ? Il n'apparaitra plus dans votre liste de clients CRM active.`)) return;

    this.api.archiveCrmClient(c.id).subscribe({
      next: () => {
        this.clients.set(this.clients().filter(item => item.id !== c.id));
        this.closeClientDrawer();
        this.loadStats();
        this.cdr.markForCheck();
      }
    });
  }

  toggleArchiveFilter(): void {
    this.isArchivedFilter.set(!this.isArchivedFilter());
    this.loadClients();
  }

  // --- CSV EXPORT FUNCTION ---
  exportCsv(): void {
    const filteredList = this.filteredClients();
    if (filteredList.length === 0) {
      alert('Aucun client à exporter pour les filtres sélectionnés.');
      return;
    }

    // CSV Headers
    const headers = [
      'Nom complet',
      'Segment',
      'LTV Score',
      'Total commandé (TND)',
      'Nombre de commandes',
      'Commande moyenne (TND)',
      'Jours depuis derniere commande',
      'Email',
      'Téléphone',
      'Entreprise',
      'Identifiant Fiscal',
      'Gouvernorat',
      'Adresse',
      'Tags',
      'Date de création'
    ];

    // Build lines using semicolon separator for French Excel compatibility
    const csvRows = [headers.join(';')];

    for (const c of filteredList) {
      const row = [
        c.full_name || '',
        c.segment || '',
        c.lifetime_value_score || '0',
        c.total_spent_tnd ? c.total_spent_tnd.toFixed(2) : '0.00',
        c.total_orders_count || '0',
        c.average_order_value_tnd ? c.average_order_value_tnd.toFixed(2) : '0.00',
        c.days_since_last_order !== null ? c.days_since_last_order : '',
        c.email || '',
        c.phone || '',
        c.company_name || '',
        c.tax_id || '',
        c.governorate || '',
        c.address || '',
        c.tags ? c.tags.join(', ') : '',
        c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : ''
      ];

      // Escape quotes and ensure clean cells
      const escapedRow = row.map(cell => {
        let cellStr = String(cell).replace(/"/g, '""');
        if (cellStr.includes(';') || cellStr.includes('\n') || cellStr.includes('"')) {
          cellStr = `"${cellStr}"`;
        }
        return cellStr;
      });

      csvRows.push(escapedRow.join(';'));
    }

    // Add UTF-8 Byte Order Mark (BOM) to force Excel to correctly render accents and characters
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `ziria_crm_clients_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- STATS / BADGE FORMATTERS ---
  segmentClass(s: string | null): string {
    if (!s) return 'badge--neutral';
    return {
      VIP: 'badge--vip',
      FIDELE: 'badge--fidele',
      NOUVEAU: 'badge--nouveau',
      INACTIF: 'badge--inactif',
      OCCASIONNEL: 'badge--occasionnel'
    }[s] ?? 'badge--neutral';
  }

  segmentLabel(s: string | null): string {
    if (!s) return 'Inconnu';
    return {
      VIP: '💎 VIP',
      FIDELE: '⭐ Fidèle',
      NOUVEAU: '🌱 Nouveau',
      INACTIF: '⚠️ Inactif',
      OCCASIONNEL: '💼 Occasionnel'
    }[s] ?? s;
  }

  noteTypeClass(t: string): string {
    return {
      NOTE: 'note-tag--note',
      APPEL: 'note-tag--appel',
      VISITE: 'note-tag--visite',
      RELANCE: 'note-tag--relance',
      COMMANDE: 'note-tag--commande',
      PAIEMENT: 'note-tag--paiement'
    }[t] ?? 'note-tag--note';
  }

  orderStatusClass(s: string): string {
    return {
      PENDING: 'badge--warning',
      CONFIRMED: 'badge--info',
      PREPARING: 'badge--purple',
      SHIPPED: 'badge--blue',
      DELIVERED: 'badge--success',
      CANCELLED: 'badge--danger'
    }[s] ?? 'badge--neutral';
  }

  orderStatusLabel(s: string): string {
    return {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmé',
      PREPARING: 'En préparation',
      SHIPPED: 'Expédié',
      DELIVERED: 'Livré',
      CANCELLED: 'Annulé'
    }[s] ?? s;
  }
}
