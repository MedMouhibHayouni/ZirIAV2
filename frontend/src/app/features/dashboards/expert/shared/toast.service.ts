import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  private _nextId = 0;

  readonly toasts = this._toasts.asReadonly();

  success(title: string, message?: string, duration = 4000) {
    this.add('success', title, message, duration);
  }

  error(title: string, message?: string, duration = 4000) {
    this.add('error', title, message, duration);
  }

  info(title: string, message?: string, duration = 4000) {
    this.add('info', title, message, duration);
  }

  dismiss(id: number) {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  private add(type: Toast['type'], title: string, message?: string, duration = 4000) {
    const id = this._nextId++;
    const toast: Toast = { id, type, title, message, duration };
    this._toasts.update(toasts => [...toasts, toast]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
