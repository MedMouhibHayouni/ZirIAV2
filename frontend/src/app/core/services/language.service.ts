import { Injectable, signal, effect } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type LanguageCode = 'fr' | 'ar';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  currentLang = signal<LanguageCode>('fr');

  constructor(private translate: TranslateService) {
    // Config @ngx-translate
    this.translate.setDefaultLang('fr');
    this.hydrateFromStorage();
    
    // Angular Effect : Basculer direction & Tranductions
    effect(() => {
      const code = this.currentLang();
      this.translate.use(code);
      localStorage.setItem('ziria-lang', code);
      
      const isRtl = code === 'ar';
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = code;
    });
  }

  toggleLanguage() {
    this.currentLang.update(v => v === 'fr' ? 'ar' : 'fr');
  }

  private hydrateFromStorage() {
    const saved = localStorage.getItem('ziria-lang') as LanguageCode;
    if (saved === 'fr' || saved === 'ar') {
      this.currentLang.set(saved);
    }
  }
}
