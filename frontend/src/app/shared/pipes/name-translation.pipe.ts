import { Pipe, PipeTransform, inject } from '@angular/core';
import { NameTranslationService } from '../../core/services/name-translation.service';

@Pipe({
  name: 'translateName',
  standalone: true,
})
export class NameTranslationPipe implements PipeTransform {
  private nameTranslationService = inject(NameTranslationService);

  transform(value: string | null | undefined): string {
    if (!value) return '';
    return this.nameTranslationService.translate(value);
  }
}
