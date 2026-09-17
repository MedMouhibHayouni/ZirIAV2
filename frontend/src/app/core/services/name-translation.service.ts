import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface NameTranslationItem {
  key: string;
  name_fr: string;
  name_ar: string;
  name_lat: string;
}

@Injectable({
  providedIn: 'root',
})
export class NameTranslationService {
  private http = inject(HttpClient);
  private dictionary = signal<Record<string, NameTranslationItem>>({});

  constructor() {
    this.loadDictionary();
  }

  async loadDictionary(): Promise<void> {
    try {
      const items = await firstValueFrom(
        this.http.get<NameTranslationItem[]>(`${environment.apiUrl}/name-dictionary`)
      );
      const dictRecord: Record<string, NameTranslationItem> = {};
      for (const item of items) {
        dictRecord[item.key.toLowerCase()] = item;
      }
      this.dictionary.set(dictRecord);
    } catch (error) {
      console.warn('[ZirIA] NameDictionary failed to load:', error);
    }
  }

  translate(key: string): string {
    if (!key) return '';
    const normKey = key.trim().toLowerCase();
    const match = this.getTranslationDetails(normKey);
    if (match) {
      return `${match.name_fr} (${match.name_ar} | ${match.name_lat})`;
    }
    return key;
  }

  getTranslationDetails(key: string): NameTranslationItem | null {
    if (!key) return null;
    const normKey = key.trim().toLowerCase();
    
    // 1. Direct exact match
    const direct = this.dictionary()[normKey];
    if (direct) return direct;
    
    // 2. Substring/Fuzzy match (e.g. if key is "Cochenille — Saissetia oleae", look for "cochenille" in the dictionary keys)
    const dictKeys = Object.keys(this.dictionary());
    for (const dKey of dictKeys) {
      if (normKey.includes(dKey) || dKey.includes(normKey)) {
        return this.dictionary()[dKey];
      }
    }
    
    return null;
  }
}
