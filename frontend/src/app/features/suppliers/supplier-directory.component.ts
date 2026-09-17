import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideMapPin, lucideStar, lucidePackage } from '@ng-icons/lucide';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-supplier-directory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideSearch, lucideMapPin, lucideStar, lucidePackage })],
  templateUrl: './supplier-directory.component.html',
  styleUrls: ['./supplier-directory.component.scss']
})
export class SupplierDirectoryComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  
  suppliers: any[] = [];
  loading = true;
  
  searchQuery = '';
  selectedGov = '';

  governorates = [
    'Kasserine', 'Sidi Bouzid', 'Kairouan', 'Gafsa', 'Sfax', 'Tunis', 'Ariana',
    'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Béja', 'Jendouba',
    'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Gabès', 'Médenine',
    'Tataouine', 'Gébili', 'Tozeur'
  ];

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.loading = true;
    this.cdr.markForCheck();
    
    let url = `${environment.apiUrl}/supplier/vitrine/directory?`;
    if (this.searchQuery) url += `search=${encodeURIComponent(this.searchQuery)}&`;
    if (this.selectedGov) url += `governorate=${encodeURIComponent(this.selectedGov)}&`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.suppliers = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange() {
    this.loadSuppliers();
  }

  getThemeGradient(color: string) {
    if (!color) color = '#10B981'; // default emerald
    return `linear-gradient(135deg, ${color}33 0%, transparent 100%)`;
  }
}
