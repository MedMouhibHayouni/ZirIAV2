import { Injectable, NotFoundException } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as path from 'path';

@Injectable()
export class SupplierPdfService {
  constructor(
    private readonly invoiceService: SupplierInvoiceService,
    private readonly dataSource: DataSource,
  ) {}

  async generateInvoicePdf(userId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await this.invoiceService.getInvoiceByIdForAnyParticipant(userId, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const supplier = await this.dataSource.getRepository(User).findOne({ where: { id: invoice.supplier_id } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    // Importer pdfmake en dynamique
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfmake = require('pdfmake');
    
    // Use Roboto virtual fonts provided by pdfmake
    const fonts = {
      Roboto: {
        normal: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
        bold: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
        italics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
        bolditalics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf')
      }
    };
    
    pdfmake.setFonts(fonts);

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        color: '#334155'
      },
      content: [
        // HEADER
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: supplier.business_name || supplier.name || 'Fournisseur ZirIA', fontSize: 18, bold: true, color: '#22c55e', margin: [0, 0, 0, 5] },
                { text: supplier.name, fontSize: 11, color: '#64748b' },
                { text: supplier.phone || '', fontSize: 10, color: '#64748b' },
                { text: supplier.email || '', fontSize: 10, color: '#64748b' },
                { text: `${supplier.governorate || ''}, Tunisie`, fontSize: 10, color: '#64748b' },
              ]
            },
            {
              width: 200,
              alignment: 'right',
              stack: [
                { text: 'FACTURE', fontSize: 28, bold: true, color: '#64748b', margin: [0, 0, 0, 5] },
                { text: invoice.invoice_number, fontSize: 14, color: '#22c55e', bold: true },
                { text: `Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`, fontSize: 11, margin: [0, 5, 0, 5] },
                this.getStatusBadge(invoice.status)
              ]
            }
          ]
        },
        
        // DIVIDER
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#22c55e' }],
          margin: [0, 15, 0, 15]
        },

        // CLIENT SECTION
        {
          fillColor: '#f8fafc',
          margin: [0, 0, 0, 20],
          padding: 10,
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Facturé à:', bold: true, margin: [0, 0, 0, 5] },
                { text: invoice.client_name, fontSize: 13, bold: true },
                invoice.client_phone ? { text: invoice.client_phone } : null,
                invoice.client_address ? { text: invoice.client_address } : null,
                invoice.client_email ? { text: invoice.client_email } : null,
                invoice.client_tax_id ? { text: `MF: ${invoice.client_tax_id}` } : null,
              ].filter(Boolean)
            },
            {
              width: 200,
              alignment: 'right',
              stack: [
                invoice.due_date ? { text: `Date d'échéance: ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}`, margin: [0, 0, 0, 5] } : null,
                invoice.payment_method ? { text: `Mode de paiement: ${this.translatePayment(invoice.payment_method)}` } : null,
              ].filter(Boolean)
            }
          ]
        },

        // ITEMS TABLE
        {
          table: {
            headerRows: 1,
            widths: ['*', 50, 70, 70, 80],
            body: [
              [
                { text: 'Description', fillColor: '#1e293b', color: 'white', bold: true, border: [false, false, false, false], margin: [5, 5, 5, 5] },
                { text: 'Qté', fillColor: '#1e293b', color: 'white', bold: true, alignment: 'center', border: [false, false, false, false], margin: [5, 5, 5, 5] },
                { text: 'Unité', fillColor: '#1e293b', color: 'white', bold: true, alignment: 'center', border: [false, false, false, false], margin: [5, 5, 5, 5] },
                { text: 'Prix unit.', fillColor: '#1e293b', color: 'white', bold: true, alignment: 'right', border: [false, false, false, false], margin: [5, 5, 5, 5] },
                { text: 'Total', fillColor: '#1e293b', color: 'white', bold: true, alignment: 'right', border: [false, false, false, false], margin: [5, 5, 5, 5] },
              ],
              ...invoice.items.map((item, index) => {
                const fill = index % 2 === 0 ? '#f1f5f9' : '#ffffff';
                return [
                  { text: item.description, fillColor: fill, border: [false, true, false, true], borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'], margin: [5, 8, 5, 8] },
                  { text: Number(item.quantity).toFixed(2), alignment: 'center', fillColor: fill, border: [false, true, false, true], borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'], margin: [5, 8, 5, 8] },
                  { text: item.unit, alignment: 'center', fillColor: fill, border: [false, true, false, true], borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'], margin: [5, 8, 5, 8] },
                  { text: `${Number(item.unit_price).toFixed(2)} TND`, alignment: 'right', fillColor: fill, border: [false, true, false, true], borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'], margin: [5, 8, 5, 8] },
                  { text: `${Number(item.total).toFixed(2)} TND`, alignment: 'right', fillColor: fill, border: [false, true, false, true], borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'], margin: [5, 8, 5, 8] },
                ];
              })
            ]
          },
          layout: {
            defaultBorder: false,
          }
        },

        // TOTALS SECTION
        {
          margin: [0, 20, 0, 0],
          columns: [
            { width: '*', text: '' },
            {
              width: 220,
              table: {
                widths: ['*', 100],
                body: [
                  [{ text: 'Sous-total', color: '#64748b' }, { text: `${Number(invoice.subtotal_tnd).toFixed(2)} TND`, alignment: 'right' }],
                  ...(Number(invoice.discount_amount_tnd) > 0 
                    ? [
                        [{ text: 'Remise', color: '#64748b' }, { text: `-${Number(invoice.discount_amount_tnd).toFixed(2)} TND`, color: '#ef4444', alignment: 'right' }],
                        [{ text: 'Base imposable', color: '#64748b' }, { text: `${(Number(invoice.subtotal_tnd) - Number(invoice.discount_amount_tnd)).toFixed(2)} TND`, alignment: 'right' }]
                      ]
                    : []),
                  [{ text: `TVA (${invoice.tax_rate}%)`, color: '#64748b' }, { text: `${Number(invoice.tax_amount_tnd).toFixed(2)} TND`, alignment: 'right' }],
                  [{ text: 'TOTAL TTC', fontSize: 14, bold: true, margin: [0, 5, 0, 0] }, { text: `${Number(invoice.total_tnd).toFixed(2)} TND`, fontSize: 14, bold: true, color: '#22c55e', alignment: 'right', margin: [0, 5, 0, 0] }],
                ]
              },
              layout: 'noBorders'
            }
          ]
        },

        // PAYMENT DETAILS (IF PARTIAL)
        ...(invoice.status === 'PARTIAL' ? [{
          margin: [0, 10, 0, 0],
          columns: [
            { width: '*', text: '' },
            {
              width: 220,
              stack: [
                { text: `Montant payé: ${Number(invoice.amount_paid_tnd).toFixed(2)} TND`, color: '#22c55e', alignment: 'right' },
                { text: `Reste à payer: ${(Number(invoice.total_tnd) - Number(invoice.amount_paid_tnd)).toFixed(2)} TND`, color: '#ef4444', bold: true, alignment: 'right' }
              ]
            }
          ]
        }] : []),

        // NOTES
        ...(invoice.notes ? [{
          margin: [0, 30, 0, 0],
          text: 'Notes:',
          bold: true
        }, {
          text: invoice.notes,
          color: '#64748b',
          italics: true,
          margin: [0, 5, 0, 0]
        }] : []),
      ],

      footer: function(currentPage: number, pageCount: number) {
        return {
          margin: [40, 0, 40, 20],
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }], margin: [0, 0, 0, 10] },
            {
              columns: [
                { width: '*', text: `Merci pour votre confiance — ${supplier.business_name || supplier.name}`, color: '#64748b', fontSize: 9 },
                { width: '*', text: 'ZirIA Platform — ziria.tn', color: '#64748b', alignment: 'center', fontSize: 9 },
                { width: '*', text: `Page ${currentPage} / ${pageCount}`, color: '#64748b', alignment: 'right', fontSize: 9 }
              ]
            },
            { text: `Cette facture a été générée via la plateforme ZirIA. Pour toute question, contactez ${supplier.phone || ''}.`, color: '#94a3b8', fontSize: 8, italics: true, alignment: 'center', margin: [0, 5, 0, 0] }
          ]
        };
      }
    };

    const pdfDoc = pdfmake.createPdf(docDefinition);
    return pdfDoc.getBuffer();
  }

  private getStatusBadge(status: string) {
    let text = 'Brouillon';
    let color = '#94a3b8';
    
    switch(status) {
      case 'SENT': text = 'Envoyée'; color = '#3b82f6'; break;
      case 'PAID': text = 'Payée'; color = '#22c55e'; break;
      case 'PARTIAL': text = 'Partielle'; color = '#f59e0b'; break;
      case 'CANCELLED': text = 'Annulée'; color = '#ef4444'; break;
    }

    return {
      table: {
        widths: [80],
        body: [[{ text, alignment: 'center', color: 'white', bold: true, fillColor: color, border: [false, false, false, false], margin: [0, 4, 0, 4] }]]
      },
      layout: 'noBorders',
      alignment: 'right'
    };
  }

  private translatePayment(method: string) {
    const m = {
      CASH: 'Espèces',
      CHEQUE: 'Chèque',
      VIREMENT: 'Virement bancaire',
      CREDIT: 'Crédit',
      AUTRE: 'Autre'
    };
    return m[method] || method;
  }
}
