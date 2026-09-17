import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

// ── Models ──────────────────────────────────────────────────────────────────
class CoopKpis {
  final int totalMembers, activeParcels;
  final double totalHa, totalRevenue;
  const CoopKpis({required this.totalMembers, required this.activeParcels, required this.totalHa, required this.totalRevenue});
  factory CoopKpis.fromJson(Map j) => CoopKpis(
        totalMembers: j['total_members'] ?? j['members'] ?? 0,
        activeParcels: j['active_parcels'] ?? 0,
        totalHa: (double.tryParse(j['total_ha']?.toString() ?? '0') ?? 0),
        totalRevenue: (double.tryParse(j['total_revenue']?.toString() ?? '0') ?? 0),
      );
}

// ── Provider ─────────────────────────────────────────────────────────────────
final coopKpisProvider = FutureProvider<CoopKpis>((ref) async {
  final res = await ref.watch(dioProvider).get('/cooperatives/kpis');
  return CoopKpis.fromJson(res.data);
});

// ── Screen ────────────────────────────────────────────────────────────────────
class CoopDashboardScreen extends ConsumerWidget {
  const CoopDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fmt = NumberFormat('#,##0.0', 'fr_FR');
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('VUE D\'ENSEMBLE', style: ZiriaText.label(color: Colors.white38, letterSpacing: 1.5)),
                Text('لوحة تحكم الجمعية', style: ZiriaText.arabicMedium(color: ZiriaColors.accentEmerald)),
              ],
            ),
            const ZirGlassCard(
              padding: EdgeInsets.all(10),
              child: Icon(Icons.analytics_rounded, color: ZiriaColors.accentEmerald, size: 20),
            ),
          ],
        ),
        const SizedBox(height: 24),
        
        ref.watch(coopKpisProvider).when(
              loading: () => const SkeletonCard(height: 140),
              error: (_, __) => ErrorState(onRetry: () => ref.invalidate(coopKpisProvider)),
              data: (kpis) => GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.3,
                children: [
                  _KpiTile(label: 'MEMBRES', value: kpis.totalMembers.toString(), icon: Icons.people_rounded, color: Colors.blue),
                  _KpiTile(label: 'PARCELLES', value: kpis.activeParcels.toString(), icon: Icons.terrain_rounded, color: ZiriaColors.primaryGreen),
                  _KpiTile(label: 'SURFACE', value: '${fmt.format(kpis.totalHa)} ha', icon: Icons.square_foot_rounded, color: ZiriaColors.warningOrange),
                  _KpiTile(label: 'REVENUS', value: fmt.format(kpis.totalRevenue), icon: Icons.payments_rounded, color: ZiriaColors.accentEmerald, unit: 'TND'),
                ],
              ),
            ),
            
        const SizedBox(height: 24),
        
        ZirGlassCard(
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.donut_small_rounded, color: Colors.white38, size: 16),
              const SizedBox(width: 8),
              Text('RÉPARTITION DES CULTURES', style: ZiriaText.label(color: Colors.white70)),
            ]),
            const SizedBox(height: 24),
            SizedBox(
              height: 200,
              child: PieChart(PieChartData(
                sections: [
                  PieChartSectionData(value: 45, title: 'Blé', color: Colors.amber, radius: 25, showTitle: false),
                  PieChartSectionData(value: 25, title: 'Tomate', color: ZiriaColors.errorRed, radius: 22, showTitle: false),
                  PieChartSectionData(value: 20, title: 'Olive', color: ZiriaColors.accentEmerald, radius: 20, showTitle: false),
                  PieChartSectionData(value: 10, title: 'Autres', color: Colors.white10, radius: 18, showTitle: false),
                ],
                sectionsSpace: 4,
                centerSpaceRadius: 40,
                centerSpaceColor: Colors.transparent,
              )),
            ),
            const SizedBox(height: 16),
            _LegendGrid(),
          ]),
        ),
        const SizedBox(height: 80),
      ]),
    );
  }
}

class _KpiTile extends StatelessWidget {
  final String label, value;
  final String? unit;
  final IconData icon;
  final Color color;
  const _KpiTile({required this.label, required this.value, required this.icon, required this.color, this.unit});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: ZiriaText.label(color: Colors.white30, fontSize: 9)),
              Icon(icon, size: 14, color: color.withOpacity(0.5)),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: ZiriaText.headingMedium(color: Colors.white)),
              if (unit != null) Text(unit!, style: ZiriaText.label(color: color, fontSize: 9)),
            ],
          ),
        ],
      ),
    );
  }
}

class _LegendGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 16, runSpacing: 8,
      children: [
        _legendItem('Blé', Colors.amber),
        _legendItem('Tomate', ZiriaColors.errorRed),
        _legendItem('Olive', ZiriaColors.accentEmerald),
        _legendItem('Autres', Colors.white24),
      ],
    );
  }

  Widget _legendItem(String name, Color col) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(width: 8, height: 8, decoration: BoxDecoration(color: col, shape: BoxShape.circle)),
      const SizedBox(width: 6),
      Text(name, style: ZiriaText.bodySmall(color: Colors.white54)),
    ],
  );
}
