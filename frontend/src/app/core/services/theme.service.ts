import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

/**
 * ZirIA Theme Service
 * Gère le Dark/Light Mode via [data-theme] sur <html>
 * et persiste le choix dans localStorage.
 *
 * Usage dans n'importe quel composant :
 *   themeService.toggle()
 *   themeService.isDark()  → signal<boolean>
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'zir-theme';

  // Signal réactif — l'UI s'y abonne sans ChangeDetection manuelle
  readonly isDark = signal<boolean>(this.getPersistedTheme() === 'dark');

  constructor() {
    // Synchronise [data-theme] sur l'élément <html> à chaque changement du signal
    effect(() => {
      const theme: Theme = this.isDark() ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem(this.STORAGE_KEY, theme);
      } catch (_) { /* Private/Incognito mode */ }
    });
  }

  toggleTheme(): void {
    this.isDark.update(v => !v);
  }

  setTheme(theme: Theme): void {
    this.isDark.set(theme === 'dark');
  }

  private getPersistedTheme(): Theme {
    try {
      return (localStorage.getItem(this.STORAGE_KEY) as Theme) ?? 'light';
    } catch {
      return 'light';
    }
  }
}
