import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * PENDING LEGAL REVIEW
 * Charte de protection des données agricoles ZirIA (FR / AR)
 */
@Component({
  selector: 'app-data-charter',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <span class="inline-block mb-2 px-3 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            PENDING LEGAL REVIEW / EN ATTENTE DE VALIDATION JURIDIQUE
          </span>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Charte de Protection des Données Agricoles</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Engagements de transparence, étanchéité et souveraineté des agriculteurs ZirIA</p>
        </div>
        <div class="flex gap-2">
          <button 
            (click)="lang.set('FR')" 
            [class.bg-emerald-600]="lang() === 'FR'"
            [class.text-white]="lang() === 'FR'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Français
          </button>
          <button 
            (click)="lang.set('AR')" 
            [class.bg-emerald-600]="lang() === 'AR'"
            [class.text-white]="lang() === 'AR'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            العربية
          </button>
        </div>
      </div>

      @if (lang() === 'FR') {
        <div class="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed text-sm bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <section>
            <h2 class="text-base font-bold text-slate-900 dark:text-white mb-2">1. Principe d'Étanchéité Totale avec l'ERP et le Marché</h2>
            <p>ZirIA garantit une séparation technique absolue entre vos données de gestion privée (comptabilité, factures, stocks, revenus, ventes B2B, transactions) et les accès institutionnels (APIA / CRDA). Aucun agent ou bureau n'a accès à vos revenus ou volumes financiers.</p>
          </section>

          <section>
            <h2 class="text-base font-bold text-slate-900 dark:text-white mb-2">2. Aucune Transmission Fiscale</h2>
            <p>La plateforme ZirIA ne transmet aucune donnée comptable, financière ou de chiffre d'affaires à l'administration fiscale ou aux autorités de contrôle des impôts. Vos données restent votre propriété exclusive.</p>
          </section>

          <section>
            <h2 class="text-base font-bold text-slate-900 dark:text-white mb-2">3. Consentement Granulaire & Révocation Immédiate</h2>
            <p>Vous conservez à tout moment le droit de révoquer un consentement accordé à un bureau APIA ou CRDA. La révocation prend effet immédiatement sans préavis.</p>
          </section>

          <section>
            <h2 class="text-base font-bold text-slate-900 dark:text-white mb-2">4. Journal d'Accès Inviolable</h2>
            <p>Chaque consultation de votre dossier par un agent fait l'objet d'un enregistrement automatique et inaltérable dans votre journal d'accès ("Qui a consulté mes données").</p>
          </section>
        </div>
      } @else {
        <div class="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed text-sm bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-right" dir="rtl">
          <section>
            <h2 class="text-base font-bold text-slate-900 dark:text-white mb-2">1. الفصل التام بين البيانات المالية والمؤسسات</h2>
            <p>تضمن منصة ZirIA الفضل الفني المطلق بين بياناتك الخاصة (المحاسبة، المبيعات، المخزون، والمداخيل) والمكاتب الإدارية. لا يمكن لأي عون إداري الاطلاع على مداخيلك أو حجم مبيعاتك.</p>
          </section>

          <section>
            <h2 class="text-base font-bold text-slate-900 dark:text-white mb-2">2. عدم إرسال البيانات للجباية</h2>
            <p>لا تقوم المنصة بإرسال أي بيانات مالية أو محاسبية إلى إدارة الجباية أو وزارة المالية. تبقى بياناتك ملكك الخاص كلياً.</p>
          </section>

          <section>
            <h2 class="text-base font-bold text-slate-900 dark:text-white mb-2">3. إلغاء الموافقة الفوري</h2>
            <p>يحق لك في أي وقت إلغاء الموافقة الممنوحة لأي مكتب إداري، ويكون للإلغاء مفعول فوري ومباشر.</p>
          </section>
        </div>
      }
    </div>
  `
})
export class DataCharterComponent {
  lang = signal<'FR' | 'AR'>('FR');
}
