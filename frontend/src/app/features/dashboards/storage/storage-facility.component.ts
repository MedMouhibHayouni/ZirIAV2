import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMapPin, lucideCamera, lucideSave, lucidePlus, lucideTrash2, lucideBuilding2, lucideBox } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';

@Component({
  selector: 'app-storage-facility',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({ lucideMapPin, lucideCamera, lucideSave, lucidePlus, lucideTrash2, lucideBuilding2, lucideBox })],
  templateUrl: './storage-facility.component.html',
  styleUrl: './storage-facility.component.scss'
})
export class StorageFacilityComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  facilities = signal<any[]>([]);
  selectedFacilityId = signal<string>('');

  formFacility = {
    id: '',
    name: '',
    governorate: 'Kasserine',
    delegation: '',
    latitude: 35.1676,
    longitude: 8.8365,
    photos: [] as { type: 'photo'; url: string; position: number }[],
  };

  newPhotoUrl = '';

  governoratesList = [
    'Kasserine', 'Sidi Bouzid', 'Gafsa', 'Le Kef', 'Siliana', 'Béja', 'Jendouba',
    'Bizerte', 'Nabeul', 'Kairouan', 'Sousse', 'Monastir', 'Mahdia', 'Sfax',
    'Gabès', 'Médenine', 'Tataouine', 'Tozeur', 'Kébili', 'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Zaghouan'
  ];

  ngOnInit() {
    this.fetchFacilities();
  }

  fetchFacilities() {
    this.http.get<any[]>(`${environment.apiUrl}/storage/facilities/my`).subscribe({
      next: (facs) => {
        this.facilities.set(facs);
        if (facs.length > 0) {
          this.loadFacility(facs[0]);
        }
        this.cdr.markForCheck();
      }
    });
  }

  loadFacility(fac: any) {
    this.selectedFacilityId.set(fac.id);
    this.formFacility = {
      id: fac.id,
      name: fac.name,
      governorate: fac.governorate,
      delegation: fac.delegation || '',
      latitude: fac.latitude || 35.1676,
      longitude: fac.longitude || 8.8365,
      photos: fac.photos || [],
    };
    this.cdr.markForCheck();
  }

  onSelectFacility(id: string) {
    const found = this.facilities().find(f => f.id === id);
    if (found) this.loadFacility(found);
  }

  addPhoto() {
    if (!this.newPhotoUrl) return;
    this.formFacility.photos.push({
      type: 'photo',
      url: this.newPhotoUrl,
      position: this.formFacility.photos.length + 1,
    });
    this.newPhotoUrl = '';
    this.cdr.markForCheck();
  }

  removePhoto(index: number) {
    this.formFacility.photos.splice(index, 1);
    this.cdr.markForCheck();
  }

  saveFacility() {
    if (!this.formFacility.name) {
      this.toast.info('Attention', 'Le nom du site est obligatoire.');
      return;
    }

    if (this.formFacility.id) {
      this.http.patch(`${environment.apiUrl}/storage/facilities/${this.formFacility.id}`, this.formFacility).subscribe({
        next: () => {
          this.toast.success('Enregistré', 'Mise à jour du site effectuée.');
          this.fetchFacilities();
        },
        error: () => this.toast.error('Erreur', 'Impossible de mettre à jour le site.')
      });
    } else {
      this.http.post(`${environment.apiUrl}/storage/facilities`, this.formFacility).subscribe({
        next: (res: any) => {
          this.toast.success('Site créé', 'Nouveau site de stockage créé.');
          this.fetchFacilities();
        },
        error: () => this.toast.error('Erreur', 'Impossible de créer le site.')
      });
    }
  }

  resetFormForNew() {
    this.selectedFacilityId.set('');
    this.formFacility = {
      id: '',
      name: '',
      governorate: 'Kasserine',
      delegation: '',
      latitude: 35.1676,
      longitude: 8.8365,
      photos: [],
    };
    this.cdr.markForCheck();
  }
}
