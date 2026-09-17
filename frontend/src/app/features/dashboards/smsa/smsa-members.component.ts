import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideUsers, lucideUserPlus, lucideTrash2, lucidePhone, lucideMail, lucideSearch, lucideChevronRight, lucideX, lucideMapPin } from '@ng-icons/lucide';
import { SmsaApiService, SmsaMember } from '../../../core/services/smsa-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-smsa-members',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({ lucideUsers, lucideUserPlus, lucideTrash2, lucidePhone, lucideMail, lucideSearch, lucideChevronRight, lucideX, lucideMapPin 
})],
  templateUrl: './smsa-members.component.html',
  styleUrl: './smsa-members.component.scss'
})
export class SmsaMembersComponent implements OnInit {
  private smsaApi = inject(SmsaApiService);

  readonly members = this.smsaApi.members;
  readonly isLoading = this.smsaApi.isLoading;
  readonly hasError = this.smsaApi.hasError;

  searchQuery = '';
  currentPage = 1;
  
  selectedMember = signal<SmsaMember | null>(null);
  memberParcels = signal<any[]>([]);
  isLoadingParcels = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData(page: number = 1) {
    this.currentPage = page;
    this.smsaApi.fetchMembers(this.currentPage, 20, this.searchQuery);
  }

  onSearch() {
    this.loadData(1);
  }

  nextPage() {
    this.loadData(this.currentPage + 1);
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadData(this.currentPage - 1);
    }
  }

  openMemberDetails(member: SmsaMember) {
    this.selectedMember.set(member);
    this.isLoadingParcels.set(true);
    this.smsaApi.fetchMemberParcels(member.id).subscribe({
      next: (data) => {
        this.memberParcels.set(data);
        this.isLoadingParcels.set(false);
      },
      error: () => {
        this.memberParcels.set([]);
        this.isLoadingParcels.set(false);
      }
    });
  }

  closeMemberDetails() {
    this.selectedMember.set(null);
    this.memberParcels.set([]);
  }

  getAvatarColor(name: string): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
