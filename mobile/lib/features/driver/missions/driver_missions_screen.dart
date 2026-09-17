import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

class DriverMission {
  final String id, status, origin, destination;
  final double? lat, lng, totalKm;
  final double earnings;
  final DateTime createdAt;
  DriverMission({required this.id, required this.status, required this.origin, required this.destination, this.lat, this.lng, this.totalKm, required this.earnings, required this.createdAt});
  factory DriverMission.fromJson(Map j) => DriverMission(
        id: j['id'] ?? '',
        status: j['status'] ?? 'PENDING',
        origin: j['origin'] ?? '',
        destination: j['destination'] ?? '',
        lat: (j['origin_lat'])?.toDouble(),
        lng: (j['origin_lng'])?.toDouble(),
        totalKm: (j['total_km'])?.toDouble(),
        earnings: (double.tryParse((j['earnings'] ?? j['price'])?.toString() ?? '0') ?? 0),
        createdAt: DateTime.tryParse(j['created_at'] ?? '') ?? DateTime.now(),
      );
}

final driverMissionsProvider = FutureProvider.family<List<DriverMission>, String>((ref, status) async {
  final res = await ref.watch(dioProvider).get('/transport/missions', queryParameters: {'status': status, 'page': 1, 'limit': 20});
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<DriverMission>((e) => DriverMission.fromJson(e)).toList();
});

class DriverMissionsScreen extends ConsumerStatefulWidget {
  const DriverMissionsScreen({super.key});
  @override
  ConsumerState<DriverMissionsScreen> createState() => _DriverMissionsScreenState();
}

class _DriverMissionsScreenState extends ConsumerState<DriverMissionsScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(children: [
      ZirGlassCard(
        margin: const EdgeInsets.all(16),
        padding: EdgeInsets.zero,
        child: TabBar(
          controller: _tab,
          labelColor: ZiriaColors.accentEmerald,
          unselectedLabelColor: Colors.white38,
          indicatorColor: ZiriaColors.accentEmerald,
          indicatorSize: TabBarIndicatorSize.label,
          dividerColor: Colors.transparent,
          tabs: const [Tab(text: 'Missions Disponibles'), Tab(text: 'En Cours')],
        ),
      ),
      Expanded(
        child: TabBarView(
          controller: _tab,
          children: [_buildAvailable(isDark), _buildActive(isDark)],
        ),
      ),
    ]);
  }

  Widget _buildAvailable(bool isDark) {
    return ref.watch(driverMissionsProvider('PENDING')).when(
          loading: () => ListView.builder(itemCount: 4, padding: const EdgeInsets.all(16), itemBuilder: (_, __) => const SkeletonCard(height: 120)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(driverMissionsProvider('PENDING'))),
          data: (missions) => missions.isEmpty
              ? const EmptyState(title: 'Aucune mission', emoji: 'ðŸš›', subtitle: 'Restez Ã  l\'Ã©coute')
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: missions.length,
                  itemBuilder: (_, i) => _MissionCard(m: missions[i], isDark: isDark, canAccept: true, onAction: () {
                    ref.invalidate(driverMissionsProvider('PENDING'));
                    ref.invalidate(driverMissionsProvider('IN_PROGRESS'));
                  }),
                ),
        );
  }

  Widget _buildActive(bool isDark) {
    return ref.watch(driverMissionsProvider('IN_PROGRESS')).when(
          loading: () => const Center(child: CircularProgressIndicator(color: ZiriaColors.accentEmerald)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(driverMissionsProvider('IN_PROGRESS'))),
          data: (missions) {
            if (missions.isEmpty) return const EmptyState(title: 'Aucune mission active', emoji: 'âœ…', subtitle: 'PrÃªt pour le prochain dÃ©part ?');
            final m = missions.first;
            return Stack(
              children: [
                // Map background
                FlutterMap(
                  options: MapOptions(initialCenter: m.lat != null ? LatLng(m.lat!, m.lng!) : const LatLng(35.5, 9.5), initialZoom: 12),
                  children: [
                    TileLayer(retinaMode: RetinaMode.isHighDensity(context), urlTemplate: isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
                    if (m.lat != null)
                      MarkerLayer(markers: [
                        Marker(point: LatLng(m.lat!, m.lng!), width: 48, height: 48, child: const Icon(Icons.local_shipping_rounded, color: ZiriaColors.accentEmerald, size: 40)),
                      ]),
                  ],
                ),
                // Mission Details HUD
                Align(
                  alignment: Alignment.bottomCenter,
                  child: ZirGlassCard(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(20),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      _MissionInfoRow(m: m),
                      const SizedBox(height: 20),
                      ZirGradientButton(
                        label: 'CONFIRMER LA LIVRAISON',
                        icon: Icons.check_circle_rounded,
                        onPressed: () async {
                          await ref.read(dioProvider).patch('/transport/missions/${m.id}', data: {'status': 'COMPLETED'});
                          ref.invalidate(driverMissionsProvider('IN_PROGRESS'));
                        },
                      ),
                    ]),
                  ),
                ),
              ],
            );
          },
        );
  }
}

class _MissionCard extends StatelessWidget {
  final DriverMission m;
  final bool isDark;
  final bool canAccept;
  final VoidCallback onAction;
  const _MissionCard({required this.m, required this.isDark, required this.canAccept, required this.onAction});

  @override
  Widget build(BuildContext context) {
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _MissionInfoRow(m: m),
        if (canAccept) ...[
          const SizedBox(height: 16),
          Consumer(builder: (ctx, ref, _) => ZirGradientButton(
            label: 'ACCEPTER CETTE MISSION',
            height: 40,
            onPressed: () async {
              await ref.read(dioProvider).patch('/transport/missions/${m.id}', data: {'status': 'IN_PROGRESS'});
              onAction();
            },
          )),
        ],
      ]),
    );
  }
}

class _MissionInfoRow extends StatelessWidget {
  final DriverMission m;
  const _MissionInfoRow({required this.m});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Container(
        width: 44, height: 44,
        decoration: BoxDecoration(color: ZiriaColors.accentEmerald.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
        child: const Icon(Icons.local_shipping_outlined, color: ZiriaColors.accentEmerald, size: 24),
      ),
      const SizedBox(width: 16),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.my_location_rounded, size: 10, color: ZiriaColors.accentEmerald),
          const SizedBox(width: 6),
          Expanded(child: Text(m.origin, style: ZiriaText.bodySmall(color: Colors.white70), maxLines: 1, overflow: TextOverflow.ellipsis)),
        ]),
        const SizedBox(height: 2),
        Row(children: [
          const Icon(Icons.location_on_rounded, size: 10, color: ZiriaColors.errorRed),
          const SizedBox(width: 6),
          Expanded(child: Text(m.destination, style: ZiriaText.bodySmall(color: Colors.white70), maxLines: 1, overflow: TextOverflow.ellipsis)),
        ]),
      ])),
      const SizedBox(width: 12),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text('${m.earnings.toInt()} TND', style: ZiriaText.headingSmall(color: ZiriaColors.accentEmerald)),
        if (m.totalKm != null) Text('${m.totalKm!.toInt()} KM', style: ZiriaText.label(color: Colors.white24, fontSize: 9)),
      ]),
    ]);
  }
}
