import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UpgradeModalService {
  readonly isOpen = signal(false);
  readonly featureName = signal('');

  open(featureName: string): void {
    this.featureName.set(featureName);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
