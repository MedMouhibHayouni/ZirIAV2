import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideSave, lucideGlobe, lucideGlobe2, lucideUploadCloud, lucideLoader } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-supplier-vitrine-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideEye, lucideSave, lucideGlobe, lucideGlobe2, lucideUploadCloud, lucideLoader })],
  templateUrl: './supplier-vitrine-editor.component.html',
  styleUrls: ['./supplier-vitrine-editor.component.scss']
})
export class SupplierVitrineEditorComponent implements OnInit {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  profile: any = {};
  originalProfile: any = {};
  loading = true;
  saving = false;
  publishing = false;
  
  photoUploading = false;
  coverUploading = false;
  
  presetColors = [
    '#10B981', // Emerald (ZirIA default)
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#14B8A6', // Teal
  ];

  previewUrl: SafeResourceUrl | null = null;

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;
    this.cdr.markForCheck();
    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (user) => {
        this.profile = { ...user };
        this.originalProfile = { ...user };
        this.updatePreviewUrl();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  save(showAlert = true) {
    if (showAlert) {
      this.saving = true;
    }
    this.cdr.markForCheck();
    const dto = {
      business_name: this.profile.business_name,
      business_description: this.profile.business_description,
      vitrine_theme_color: this.profile.vitrine_theme_color,
      vitrine_photo_url: this.profile.vitrine_photo_url,
      vitrine_cover_url: this.profile.vitrine_cover_url,
      facebook_url: this.profile.facebook_url,
      website_url: this.profile.website_url,
      whatsapp_number: this.profile.whatsapp_number
    };

    this.http.patch(`${environment.apiUrl}/supplier/vitrine/profile`, dto).subscribe({
      next: (res) => {
        this.profile = { ...this.profile, ...(res as any) };
        this.originalProfile = { ...this.profile };
        this.saving = false;
        this.updatePreviewUrl();
        this.cdr.markForCheck();
        if (showAlert) {
          alert('Modifications enregistrées !');
        }
      },
      error: (err) => {
        this.saving = false;
        this.cdr.markForCheck();
        if (showAlert) {
          alert(err.error?.message || 'Erreur lors de la sauvegarde. Vérifiez votre abonnement.');
        }
      }
    });
  }

  togglePublish() {
    this.publishing = true;
    this.cdr.markForCheck();
    const url = this.profile.is_vitrine_published 
      ? `${environment.apiUrl}/supplier/vitrine/unpublish` 
      : `${environment.apiUrl}/supplier/vitrine/publish`;
    
    this.http.post(url, {}).subscribe({
      next: () => {
        this.profile.is_vitrine_published = !this.profile.is_vitrine_published;
        this.publishing = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.publishing = false;
        this.cdr.markForCheck();
        alert(err.error?.message || 'Erreur. Vérifiez votre abonnement.');
      }
    });
  }

  selectColor(color: string) {
    this.profile.vitrine_theme_color = color;
    this.cdr.markForCheck();
    this.save(false);
  }

  updatePreviewUrl() {
    // Show the public vitrine in iframe with preview bypass enabled
    const origin = window.location.origin;
    if (this.profile.id) {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${origin}/suppliers/${this.profile.id}?preview=true`);
      this.cdr.markForCheck();
    }
  }

  uploadFile(file: File, type: 'logo' | 'cover') {
    if (type === 'logo') {
      this.photoUploading = true;
    } else {
      this.coverUploading = true;
    }
    this.cdr.markForCheck();

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>(`${environment.apiUrl}/upload/image`, formData).subscribe({
      next: (res) => {
        if (type === 'logo') {
          this.profile.vitrine_photo_url = res.url;
          this.photoUploading = false;
        } else {
          this.profile.vitrine_cover_url = res.url;
          this.coverUploading = false;
        }
        this.cdr.markForCheck();
        // Silent save to trigger live preview refresh immediately
        this.save(false);
      },
      error: () => {
        if (type === 'logo') {
          this.photoUploading = false;
        } else {
          this.coverUploading = false;
        }
        this.cdr.markForCheck();
        alert('Erreur lors du téléchargement de l\'image.');
      }
    });
  }

  onPhotoSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.uploadFile(file, 'logo');
    }
  }

  onCoverSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.uploadFile(file, 'cover');
    }
  }
}
