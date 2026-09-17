import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';

class DriverLogbookEntry {
  final String id, origin, destination;
  final double km, earnings;
  final DateTime date;
  DriverLogbookEntry({required this.id, required this.origin, required this.destination, required this.km, required this.earnings, required this.date});
  factory DriverLogbookEntry.fromJson(Map j) => DriverLogbookEntry(
        id: j['id'] ?? '',
        origin: j['origin'] ?? '',
        destination: j['destination'] ?? '',
        km: (double.tryParse(j['total_km']?.toString() ?? '0') ?? 0),
        earnings: (double.tryParse(j['earnings']?.toString() ?? '0') ?? 0),
        date: DateTime.tryParse(j['completed_at'] ?? j['created_at'] ?? '') ?? DateTime.now(),
      );
}

final driverLogbookProvider = FutureProvider<List<DriverLogbookEntry>>((ref) async {
  final res = await ref.watch(dioProvider).get('/transport/missions', queryParameters: {'status': 'COMPLETED', 'page': 1, 'limit': 30});
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<DriverLogbookEntry>((e) => DriverLogbookEntry.fromJson(e)).toList();
});

class DriverLogbookScreen extends ConsumerWidget {
  const DriverLogbookScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fmt = NumberFormat('#,##0', 'fr_FR');
    
    return ref.watch(driverLogbookProvider).when(
          loading: () => const Padding(padding: EdgeInsets.all(16), child: SkeletonCard(height: 120)),
          error: (_, __) => const SizedBox.shrink(),
          data: (entries) {
            final totalEarnings = entries.fold(0.0, (sum, e) => sum + e.earnings);
            final totalKm = entries.fold(0.0, (sum, e) => sum + e.km);
            
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Row(children: [
                  _KpiCard(label: 'REVENUS TOTAL', value: '${fmt.format(totalEarnings)} TND', icon: Icons.payments_rounded, color: ZiriaColors.accentEmerald),
                  const SizedBox(width: 12),
                  _KpiCard(label: 'DISTANCE TOTAL', value: '${fmt.format(totalKm)} KM', icon: Icons.route_rounded, color: ZiriaColors.warningOrange),
                ]),
                const SizedBox(height: 24),
                
                if (entries.isNotEmpty) 
                  ZirGlassCard(
                    padding: const EdgeInsets.all(24),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('TENDANCE REVENUS', style: ZiriaText.label(color: Colors.white38, fontSize: 10)),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 140,
                        child: BarChart(BarChartData(
                          gridData: const FlGridData(show: false),
                          borderData: FlBorderData(show: false),
                          titlesData: const FlTitlesData(show: false),
                          barGroups: entries.take(8).toList().asMap().entries.map((e) => BarChartGroupData(
                            x: e.key,
                            barRods: [BarChartRodData(
                              toY: e.value.earnings,
                              color: ZiriaColors.accentEmerald,
                              width: 16,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                              backDrawRodData: BackgroundBarChartRodData(show: true, toY: totalEarnings / entries.length * 1.5, color: Colors.white.withOpacity(0.05)),
                            )]
                          )).toList(),
                        )),
                      ),
                    ]),
                  ),
                  
                const SizedBox(height: 32),
                Text('HISTORIQUE DES MISSIONS', style: ZiriaText.label(color: Colors.white38, letterSpacing: 1.2)),
                const SizedBox(height: 12),
                ...entries.map((e) => _LogEntryTile(e: e)),
                const SizedBox(height: 80),
              ],
            );
          },
        );
  }
}

class _KpiCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _KpiCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: ZirGlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 16, color: color.withOpacity(0.5)),
          const SizedBox(height: 12),
          Text(value, style: ZiriaText.headingSmall(), overflow: TextOverflow.ellipsis),
          Text(label, style: ZiriaText.label(color: Colors.white24, fontSize: 8)),
        ]),
      ),
    );
  }
}

class _LogEntryTile extends StatelessWidget {
  final DriverLogbookEntry e;
  const _LogEntryTile({required this.e});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.history_rounded, color: Colors.white38, size: 20),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${e.origin} → ${e.destination}', style: ZiriaText.bodyMedium(), maxLines: 1, overflow: TextOverflow.ellipsis),
            Text('${e.km.toInt()} KM · ${DateFormat('dd/MM/yyyy').format(e.date)}', style: ZiriaText.bodySmall(color: Colors.white30)),
          ]
        )),
        Text('+${e.earnings.toInt()}', style: ZiriaText.labelBold(color: ZiriaColors.accentEmerald)),
      ]),
    );
  }
}
