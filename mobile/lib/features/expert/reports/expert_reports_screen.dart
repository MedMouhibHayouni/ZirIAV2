import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';

// ── Model ─────────────────────────────────────────────────────────────────────
class ExpertReport {
  final String id, title, status;
  final int alertsAnalyzed, farmersAffected;
  final DateTime createdAt;
  const ExpertReport({required this.id, required this.title, required this.status, required this.alertsAnalyzed, required this.farmersAffected, required this.createdAt});
  factory ExpertReport.fromJson(Map j) => ExpertReport(
        id: j['id'] ?? '',
        title: j['title'] ?? 'Rapport',
        status: j['status'] ?? 'DRAFT',
        alertsAnalyzed: j['alerts_analyzed'] ?? 0,
        farmersAffected: j['farmers_affected'] ?? 0,
        createdAt: DateTime.tryParse(j['created_at'] ?? '') ?? DateTime.now(),
      );
}

// ── Provider ─────────────────────────────────────────────────────────────────
final expertReportsProvider = FutureProvider<List<ExpertReport>>((ref) async {
  final res = await ref.watch(dioProvider).get('/disease-detections/reports');
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<ExpertReport>((e) => ExpertReport.fromJson(e)).toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────
class ExpertReportsScreen extends ConsumerWidget {
  const ExpertReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: ZirGradientButton(
          label: 'GÉNÉRER UN RAPPORT PHYTOSANITAIRE',
          icon: Icons.assignment_rounded,
          onPressed: () => _generateReport(context, ref),
        ),
      ),
      Expanded(
          child: ref.watch(expertReportsProvider).when(
                loading: () => ListView.builder(itemCount: 4, padding: const EdgeInsets.symmetric(horizontal: 16), itemBuilder: (_, __) => const SkeletonCard(height: 100)),
                error: (_, __) => const SizedBox.shrink(),
                data: (reports) => reports.isEmpty
                    ? const Center(child: Text('Aucun rapport généré', style: TextStyle(color: Colors.white38)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: reports.length,
                        itemBuilder: (_, i) => _ReportCard(r: reports[i], isDark: isDark),
                      ),
              )),
    ]);
  }

  Future<void> _generateReport(BuildContext ctx, WidgetRef ref) async {
    final zones = ['Kasserine', 'Sidi Bouzid', 'Kairouan', 'Sfax'];
    String zone = zones.first;
    final ok = await showGeneralDialog<bool>(
      context: ctx,
      barrierDismissible: true,
      barrierLabel: '',
      pageBuilder: (c, a1, a2) => Center(
        child: ZirGlassCard(
          width: 320,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Nouveau Rapport', style: ZiriaText.headingMedium()),
              const SizedBox(height: 24),
              DropdownButtonFormField<String>(
                initialValue: zone,
                dropdownColor: ZiriaColors.bgDeep,
                style: const TextStyle(color: Colors.white),
                items: zones.map((z) => DropdownMenuItem(value: z, child: Text(z))).toList(),
                onChanged: (v) => zone = v!,
                decoration: InputDecoration(
                  labelText: 'Gouvernorat',
                  labelStyle: const TextStyle(color: Colors.white70),
                  filled: true,
                  fillColor: Colors.white10,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(child: TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Annuler', style: TextStyle(color: Colors.white38)))),
                  const SizedBox(width: 12),
                  Expanded(child: ZirGradientButton(label: 'Générer', height: 44, onPressed: () => Navigator.pop(c, true))),
                ],
              )
            ],
          ),
        ),
      ),
    );
    if (ok == true) {
      await ref.read(dioProvider).post('/disease-detections/reports', data: {'zone': zone});
      ref.invalidate(expertReportsProvider);
    }
  }
}

class _ReportCard extends StatelessWidget {
  final ExpertReport r;
  final bool isDark;
  const _ReportCard({required this.r, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Container(
          width: 48, height: 48,
          decoration: BoxDecoration(color: ZiriaColors.accentEmerald.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: const Icon(Icons.description_outlined, color: ZiriaColors.accentEmerald, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(r.title, style: ZiriaText.headingSmall()),
            const SizedBox(height: 4),
            Text('${r.alertsAnalyzed} alertes · ${r.farmersAffected} agriculteurs', style: ZiriaText.bodySmall(color: Colors.white38)),
            Text(DateFormat('dd MMM yyyy').format(r.createdAt), style: ZiriaText.label(color: Colors.white24, fontSize: 10)),
          ]
        )),
        _PdfExportBtn(r: r),
      ]),
    );
  }
}

class _PdfExportBtn extends StatefulWidget {
  final ExpertReport r;
  const _PdfExportBtn({required this.r});
  @override
  State<_PdfExportBtn> createState() => _PdfExportBtnState();
}

class _PdfExportBtnState extends State<_PdfExportBtn> {
  bool _loading = false;

  Future<void> _export() async {
    setState(() => _loading = true);
    final r = widget.r;
    final doc = pw.Document();
    doc.addPage(pw.Page(build: (_) => pw.Padding(
      padding: const pw.EdgeInsets.all(32),
      child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
        pw.Text('Rapport Phytosanitaire — ZirIA Sentinel', style: pw.TextStyle(fontSize: 22, color: PdfColors.green700, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 24),
        pw.Text(r.title, style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 8),
        pw.Text('Date: ${DateFormat('dd/MM/yyyy').format(r.createdAt)}'),
        pw.Text('Alertes analysées: ${r.alertsAnalyzed}'),
        pw.Text('Agriculteurs affectés: ${r.farmersAffected}'),
        pw.Divider(),
        pw.Text('Rapport généré par ZirIA Sentinel — AI Platform'),
      ])
    )));
    await Printing.sharePdf(bytes: await doc.save(), filename: 'rapport-ziria-${r.id}.pdf');
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _loading ? null : _export,
      child: Container(
        width: 40, height: 40,
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(10)),
        child: _loading 
            ? const Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2, color: ZiriaColors.accentEmerald))
            : const Icon(Icons.picture_as_pdf_rounded, color: ZiriaColors.accentEmerald, size: 20),
      ),
    );
  }
}
