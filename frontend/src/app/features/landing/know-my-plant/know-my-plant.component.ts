import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideLeaf,
  lucideSparkles,
  lucideCamera,
  lucideUpload,
  lucideSun,
  lucideSearch,
  lucideShieldAlert,
  lucideInfo,
  lucideUserPlus,
  lucideBrain,
  lucideBookOpen,
  lucideRefreshCw,
  lucideShield,
  lucideActivity,
  lucideStore,
  lucideMapPin,
  lucideTractor,
  lucideCheck,
  lucideDroplets,
} from '@ng-icons/lucide';
import { PublicNavbarComponent } from '../../../shared/components/public-navbar/public-navbar.component';
import { environment } from '../../../../environments/environment';

export interface PlantResult {
  rateLimited: boolean;
  plant_name_fr?: string;
  plant_name_ar?: string;
  plant_name_lat?: string;
  description_fr?: string;
  description_darija?: string;
  care_tips?: string[];
  agricultural_relevance?: string;
  photo_url?: string;
  message_fr?: string;
  message_ar?: string;
}

type PageState = 'upload' | 'analyzing' | 'result' | 'limited';

@Component({
  selector: 'app-know-my-plant',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, PublicNavbarComponent],
  providers: [
    provideIcons({
      lucideLeaf,
      lucideSparkles,
      lucideCamera,
      lucideUpload,
      lucideSun,
      lucideSearch,
      lucideShieldAlert,
      lucideInfo,
      lucideUserPlus,
      lucideBrain,
      lucideBookOpen,
      lucideRefreshCw,
      lucideShield,
      lucideActivity,
      lucideStore,
      lucideMapPin,
      lucideTractor,
  lucideCheck,
  lucideDroplets,
    })
  ],
  templateUrl: './know-my-plant.component.html',
  styleUrl: './know-my-plant.component.scss',
})
export class KnowMyPlantComponent {
  private http = inject(HttpClient);

  state = signal<PageState>('upload');
  result = signal<PlantResult | null>(null);
  previewUrl = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  isDragOver = signal(false);

  private selectedFile: File | null = null;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave() {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.errorMsg.set('Veuillez sélectionner une image (JPEG, PNG ou WebP).');
      return;
    }
    this.errorMsg.set(null);
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async analyze() {
    if (!this.selectedFile) return;
    this.state.set('analyzing');
    this.errorMsg.set(null);

    try {
      // Step 1: Upload image to public endpoint
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      const uploadRes: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/upload/public/plant`, formData)
      );

      const photoUrl = uploadRes.url;

      // Step 2: Call identify endpoint (attach token if available)
      const token = localStorage.getItem('access_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const identifyRes = await firstValueFrom(
        this.http.post<PlantResult>(
          `${environment.apiUrl}/ai/know-my-plant`,
          { photo_url: photoUrl },
          { headers: new HttpHeaders(headers) }
        ).pipe(timeout(60000))
      );

      const res = identifyRes!;
      res.photo_url = photoUrl;
      this.result.set(res);

      if (res.rateLimited) {
        this.state.set('limited');
      } else {
        this.state.set('result');
      }
    } catch (err: any) {
      if (err instanceof HttpErrorResponse) {
        const backendMsg = err.error?.message || err.error?.error;
        this.errorMsg.set(backendMsg || `Erreur serveur (${err.status}). Veuillez réessayer.`);
      } else {
        this.errorMsg.set("Une erreur est survenue. Veuillez réessayer.");
      }
      this.state.set('upload');
    }
  }

  reset() {
    this.state.set('upload');
    this.result.set(null);
    this.previewUrl.set(null);
    this.selectedFile = null;
    this.errorMsg.set(null);
  }
}
