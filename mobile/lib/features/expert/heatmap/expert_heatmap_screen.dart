import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/state_widgets.dart';

// â”€â”€ Model â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class HeatPoint {
  final double lat, lng, intensity;
  const HeatPoint({required this.lat, required this.lng, required this.intensity});
  factory HeatPoint.fromJson(Map j) => HeatPoint(
        lat: (double.tryParse((j['lat'] ?? j['latitude'])?.toString() ?? '0') ?? 0),
        lng: (double.tryParse((j['lng'] ?? j['longitude'])?.toString() ?? '0') ?? 0),
        intensity: (double.tryParse((j['intensity'] ?? j['severity_score'])?.toString() ?? '0.5') ?? 0.5),
      );
}

class ExpertZoneStat {
  final String governorate;
  final int alertCount, farmerCount;
  final double severityAvg;
  const ExpertZoneStat({required this.governorate, required this.alertCount, required this.farmerCount, required this.severityAvg});
  factory ExpertZoneStat.fromJson(Map j) => ExpertZoneStat(
        governorate: j['governorate'] ?? '',
        alertCount: j['alert_count'] ?? 0,
        farmerCount: j['farmer_count'] ?? 0,
        severityAvg: (double.tryParse(j['severity_avg']?.toString() ?? '0') ?? 0),
      );
}

// â”€â”€ Providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
final heatmapPointsProvider = FutureProvider<List<HeatPoint>>((ref) async {
  final res = await ref.watch(dioProvider).get('/ai/disease-heatmap');
  final list = res.data is List ? res.data as List : (res.data['points'] ?? []);
  return list.map<HeatPoint>((e) => HeatPoint.fromJson(e)).toList();
});

final expertZoneStatsProvider = FutureProvider<List<ExpertZoneStat>>((ref) async {
  final res = await ref.watch(dioProvider).get('/alerts/expert/stats');
  final list = res.data is List ? res.data as List : (res.data['zones'] ?? []);
  return list.map<ExpertZoneStat>((e) => ExpertZoneStat.fromJson(e)).toList();
});

// â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class ExpertHeatmapScreen extends ConsumerWidget {
  const ExpertHeatmapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    return Stack(
      children: [
        // Map Background
        ref.watch(heatmapPointsProvider).when(
          loading: () => const Center(child: CircularProgressIndicator(color: ZiriaColors.accentEmerald)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(heatmapPointsProvider)),
          data: (points) => FlutterMap(
            options: const MapOptions(initialCenter: LatLng(35.5, 9.5), initialZoom: 7.5),
            children: [
              TileLayer(retinaMode: RetinaMode.isHighDensity(context), urlTemplate: tileUrl, subdomains: const ['a', 'b', 'c']),
              CircleLayer(
                circles: points.map((p) => CircleMarker(
                  point: LatLng(p.lat, p.lng),
                  radius: 30 + (p.intensity * 25),
                  color: _intensityColor(p.intensity).withOpacity(0.35),
                  borderColor: _intensityColor(p.intensity),
                  borderStrokeWidth: 1.5,
                )).toList()
              ),
            ],
          ),
        ),

        // HUD: Legend (Top Center)
        Positioned(
          top: 16, left: 16, right: 16,
          child: ZirGlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _legend('Faible', ZiriaColors.accentEmerald),
                _legend('Moyen', ZiriaColors.warningOrange),
                _legend('Ã‰levÃ©', ZiriaColors.errorRed),
                _legend('Urgent', const Color(0xFF7f1d1d)),
              ],
            ),
          ),
        ),

        // Bottom Sheet Style Zone Stats
        Align(
          alignment: Alignment.bottomCenter,
          child: DraggableScrollableSheet(
            initialChildSize: 0.35,
            minChildSize: 0.15,
            maxChildSize: 0.6,
            builder: (ctx, scroll) => ZirGlassCard(
              margin: EdgeInsets.zero,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              padding: EdgeInsets.zero,
              child: CustomScrollView(
                controller: scroll,
                slivers: [
                  SliverToBoxAdapter(
                    child: Center(
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 12),
                        width: 40, height: 4,
                        decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      child: Text('DÃ‰TAILS DES ZONES', style: ZiriaText.label(color: Colors.white70, letterSpacing: 1.5)),
                    ),
                  ),
                  ref.watch(expertZoneStatsProvider).when(
                    loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
                    error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
                    data: (zones) => SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) {
                          final z = zones[i];
                          final risk = z.severityAvg / 4;
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            child: _ZoneTile(z: z, risk: risk),
                          );
                        },
                        childCount: zones.length,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Color _intensityColor(double v) {
    if (v < 0.25) return ZiriaColors.accentEmerald;
    if (v < 0.5) return ZiriaColors.warningOrange;
    if (v < 0.75) return ZiriaColors.errorRed;
    return const Color(0xFF7f1d1d);
  }

  Widget _legend(String label, Color color) => Row(children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle, boxShadow: [BoxShadow(color: color.withOpacity(0.5), blurRadius: 4)])),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.white70, fontWeight: FontWeight.bold)),
      ]);
}

class _ZoneTile extends StatelessWidget {
  final ExpertZoneStat z;
  final double risk;
  const _ZoneTile({required this.z, required this.risk});

  @override
  Widget build(BuildContext context) {
    final col = _riskColor(risk);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(z.governorate, style: ZiriaText.headingSmall()),
              const SizedBox(height: 4),
              Text('${z.farmerCount} agriculteurs Â· ${z.alertCount} alertes', style: ZiriaText.bodySmall(color: Colors.white38)),
            ]
          )),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: col.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: col.withOpacity(0.3)),
            ),
            child: Text('RISQUE ${(risk * 100).toInt()}%', style: ZiriaText.label(color: col, fontSize: 10)),
          ),
        ],
      ),
    );
  }

  Color _riskColor(double v) {
    if (v < 0.25) return ZiriaColors.accentEmerald;
    if (v < 0.5) return ZiriaColors.warningOrange;
    if (v < 0.75) return ZiriaColors.errorRed;
    return const Color(0xFF7f1d1d);
  }
}
