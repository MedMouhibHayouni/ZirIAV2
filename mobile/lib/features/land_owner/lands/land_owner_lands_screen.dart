import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';

class LandProperty {
  final String id, name, location, governorate;
  final double areaHa;
  final LatLng coord;
  LandProperty({required this.id, required this.name, required this.location, required this.governorate, required this.areaHa, required this.coord});
  factory LandProperty.fromJson(Map j) => LandProperty(
        id: j['id'] ?? '',
        name: j['name'] ?? 'Terrain Sans Nom',
        location: j['location'] ?? '',
        governorate: j['governorate'] ?? '',
        areaHa: (double.tryParse(j['area_ha']?.toString() ?? '0') ?? 0),
        coord: LatLng((j['latitude'] ?? 35.5), (j['longitude'] ?? 9.5)),
      );
}

final landOwnerLandsProvider = FutureProvider<List<LandProperty>>((ref) async {
  final res = await ref.watch(dioProvider).get('/lands/my');
  final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
  return list.map<LandProperty>((e) => LandProperty.fromJson(e)).toList();
});

class LandOwnerLandsScreen extends ConsumerWidget {
  const LandOwnerLandsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: ZirGradientButton(
              label: 'AJOUTER UN NOUVEAU TERRAIN',
              icon: Icons.add_location_alt_rounded,
              onPressed: () {},
            ),
          ),
          Expanded(
            child: ref.watch(landOwnerLandsProvider).when(
                  loading: () => ListView.builder(padding: const EdgeInsets.all(16), itemCount: 4, itemBuilder: (_, __) => const SkeletonCard(height: 160)),
                  error: (_, __) => ErrorState(onRetry: () => ref.invalidate(landOwnerLandsProvider)),
                  data: (lands) => lands.isEmpty
                      ? const EmptyState(title: 'Aucun terrain', emoji: 'ðŸ—ºï¸', subtitle: 'Enregistrez vos propriÃ©tÃ©s fonciÃ¨res')
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: lands.length,
                          itemBuilder: (ctx, i) => _LandCard(land: lands[i]),
                        ),
                ),
          ),
        ],
      ),
    );
  }
}

class _LandCard extends StatelessWidget {
  final LandProperty land;
  const _LandCard({required this.land});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ZirGlassCard(
      margin: const EdgeInsets.only(bottom: 16),
      padding: EdgeInsets.zero,
      child: Column(children: [
        SizedBox(
          height: 120,
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            child: FlutterMap(
              options: MapOptions(initialCenter: land.coord, initialZoom: 14, interactionOptions: const InteractionOptions(flags: InteractiveFlag.none)),
              children: [
                TileLayer(retinaMode: RetinaMode.isHighDensity(context), urlTemplate: isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
                MarkerLayer(markers: [
                  Marker(point: land.coord, width: 32, height: 32, child: const Icon(Icons.location_on_rounded, color: ZiriaColors.errorRed, size: 28)),
                ]),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(land.name, style: ZiriaText.headingSmall()),
              Text('${land.governorate}, ${land.location}', style: ZiriaText.bodySmall(color: Colors.white38)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('${land.areaHa} HA', style: ZiriaText.headingMedium(color: ZiriaColors.accentEmerald)),
              const Text('SURFACE', style: TextStyle(color: Colors.white24, fontSize: 8, fontWeight: FontWeight.bold)),
            ]),
          ]),
        ),
      ]),
    );
  }
}
