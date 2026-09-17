import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../models/map_data_model.dart';
import '../parcel_repository.dart';

// â”€â”€â”€ State Providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
final selectedParcelProvider = StateProvider<ParcelWithZones?>((ref) => null);

class ParcelMapNotifier extends AsyncNotifier<ParcelMapData> {
  @override
  Future<ParcelMapData> build() async {
    return ref.watch(parcelRepositoryProvider).getMapData();
  }

  Future<void> createParcel(Map<String, dynamic> data) async {
    await ref.read(parcelRepositoryProvider).createParcel(data);
    ref.invalidateSelf();
  }
}

final parcelMapNotifierProvider = AsyncNotifierProvider<ParcelMapNotifier, ParcelMapData>(() {
  return ParcelMapNotifier();
});

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Color hexToColor(String code) {
  try {
    return Color(int.parse(code.substring(1, 7), radix: 16) + 0xFF000000);
  } catch (_) {
    return Colors.grey;
  }
}

bool isPointInPolygon(LatLng point, List<LatLng> polygon) {
  int intersectCount = 0;
  for (int j = 0; j < polygon.length - 1; j++) {
    if (_rayCastIntersect(point, polygon[j], polygon[j + 1])) {
      intersectCount++;
    }
  }
  if (polygon.isNotEmpty) {
    if (_rayCastIntersect(point, polygon.last, polygon.first)) {
      intersectCount++;
    }
  }
  return (intersectCount % 2) == 1;
}

bool _rayCastIntersect(LatLng point, LatLng vertA, LatLng vertB) {
  double aY = vertA.latitude; double bY = vertB.latitude;
  double aX = vertA.longitude; double bX = vertB.longitude;
  double pY = point.latitude; double pX = point.longitude;

  if ((aY > pY && bY > pY) || (aY < pY && bY < pY) || (aX < pX && bX < pX)) {
    return false;
  }
  double m = (aY - bY) / (aX - bX);
  double bee = (-aX) * m + aY;
  double x = (pY - bee) / m;
  return x > pX;
}

// â”€â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class ParcelIntelligenceScreen extends ConsumerStatefulWidget {
  const ParcelIntelligenceScreen({super.key});
  @override
  ConsumerState<ParcelIntelligenceScreen> createState() => _ParcelIntelligenceScreenState();
}

class _ParcelIntelligenceScreenState extends ConsumerState<ParcelIntelligenceScreen> with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  bool _useSatellite = false;
  String _drawMode = 'none'; // 'none', 'parcel', 'zone'
  List<LatLng> _drawnPoints = [];
  bool _offlineMode = false;

  late AnimationController _pulseController;
  late AnimationController _hudController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(duration: const Duration(seconds: 2), vsync: this)..repeat(reverse: true);
    _hudController = AnimationController(duration: const Duration(milliseconds: 400), vsync: this)..forward();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _hudController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  void _onMapTap(TapPosition tapPosition, LatLng point) {
    if (_drawMode != 'none') return;

    final data = ref.read(parcelMapNotifierProvider).value;
    if (data == null) return;

    ParcelWithZones? tappedParcel;
    for (final p in data.parcels) {
      if (p.points.isNotEmpty && isPointInPolygon(point, p.points)) {
        tappedParcel = p;
        break;
      }
    }

    if (tappedParcel != null) {
      ref.read(selectedParcelProvider.notifier).state = tappedParcel;
    } else {
      ref.read(selectedParcelProvider.notifier).state = null;
    }
  }

  void _startDrawing(String mode) {
    setState(() {
      _drawMode = mode;
      _drawnPoints = [];
    });
    ref.read(selectedParcelProvider.notifier).state = null;
  }

  void _addPoint() {
    final center = _mapController.camera.center;
    if (_drawMode == 'zone') {
      final selectedParcel = ref.read(selectedParcelProvider);
      if (selectedParcel != null && selectedParcel.points.isNotEmpty) {
        if (!isPointInPolygon(center, selectedParcel.points)) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ce point est en dehors de votre parcelle'), backgroundColor: Colors.red),
          );
          return;
        }
      }
    }
    setState(() {
      _drawnPoints.add(center);
    });
  }

  void _finishDrawing() {
    if (_drawnPoints.length < 3) return;
    
    final geojson = {
      "type": "Polygon",
      "coordinates": [
        [..._drawnPoints.map((p) => [p.longitude, p.latitude]), [_drawnPoints.first.longitude, _drawnPoints.first.latitude]]
      ]
    };

    if (_drawMode == 'parcel') {
      _showNewParcelForm(geojson);
    } else {
      setState(() {
        _drawMode = 'none';
        _drawnPoints = [];
      });
    }
  }

  void _showNewParcelForm(Map<String, dynamic> geojson) {
    final nameCtrl = TextEditingController();
    String color = '#2D6A4F';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          return ZirGlassCard(
            margin: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 16, right: 16, top: 24),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Nouvelle parcelle', style: ZiriaText.headingLarge()),
                const SizedBox(height: 16),
                TextField(
                  controller: nameCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Nom de la parcelle',
                    labelStyle: const TextStyle(color: Colors.white70),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.05),
                  ),
                ),
                const SizedBox(height: 20),
                Text('COULEUR D\'IDENTITÃ‰', style: ZiriaText.label(color: ZiriaColors.accentEmerald)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 16,
                  children: ['#2D6A4F', '#F4A261', '#E9C46A', '#E63946'].map((hex) {
                    final isSel = color == hex;
                    return GestureDetector(
                      onTap: () => setModalState(() => color = hex),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: hexToColor(hex),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withOpacity(isSel ? 0.8 : 0.2), width: isSel ? 3 : 1),
                          boxShadow: isSel ? [BoxShadow(color: hexToColor(hex).withOpacity(0.5), blurRadius: 10)] : null,
                        ),
                        child: isSel ? const Icon(Icons.check, color: Colors.white, size: 20) : null,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 32),
                ZirGradientButton(
                  label: 'Enregistrer la parcelle',
                  onPressed: () async {
                    Navigator.pop(ctx);
                    try {
                      await ref.read(parcelMapNotifierProvider.notifier).createParcel({
                        'name': nameCtrl.text.trim(),
                        'color_hex': color,
                        'boundary_geojson': geojson,
                      });
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Parcelle crÃ©Ã©e !')));
                    } catch (_) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur crÃ©ation'), backgroundColor: Colors.red));
                    }
                    if (!mounted) return;
                    setState(() {
                      _drawMode = 'none';
                      _drawnPoints = [];
                    });
                  },
                ),
                const SizedBox(height: 16),
              ],
            ),
          );
        }
      )
    );
  }

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(parcelMapNotifierProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgDeep : ZiriaColors.bgLight,
      body: Stack(
        children: [
          // â”€â”€ Map Base
          asyncData.when(
            loading: () => const Center(child: CircularProgressIndicator(color: ZiriaColors.accentEmerald)),
            error: (e, st) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!_offlineMode) setState(() => _offlineMode = true);
              });
              return _buildMap(null, isDark);
            },
            data: (data) => _buildMap(data, isDark),
          ),

          // â”€â”€ Map Top Controls (Glass)
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            right: 16,
            child: FadeTransition(
              opacity: _hudController,
              child: Column(
                children: [
                  _MapControlBtn(
                    icon: _useSatellite ? Icons.map_outlined : Icons.satellite_outlined,
                    onTap: () => setState(() => _useSatellite = !_useSatellite),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 8),
                  _MapControlBtn(
                    icon: Icons.my_location_rounded,
                    onTap: () {
                      // Mock GPS center
                      _mapController.move(const LatLng(35.1674, 8.8362), 15);
                    },
                    isDark: isDark,
                  ),
                ],
              ),
            ),
          ),

          if (_offlineMode)
            Positioned(
              top: MediaQuery.of(context).padding.top + 16,
              left: 16,
              child: ZirGlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(children: [
                  const Icon(Icons.signal_wifi_off_rounded, color: Colors.orange, size: 16),
                  const SizedBox(width: 8),
                  Text('Mode hors-ligne', style: ZiriaText.label(color: Colors.white)),
                ]),
              ),
            ),

          // â”€â”€ Draw Crosshair HUD
          if (_drawMode != 'none') ...[
            Center(
              child: Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: ZiriaColors.accentEmerald, width: 2),
                ),
                child: Center(child: Container(width: 4, height: 4, color: ZiriaColors.accentEmerald)),
              ),
            ),
            Positioned(
              top: 100,
              left: 32, right: 32,
              child: ZirGlassCard(
                padding: const EdgeInsets.all(16),
                child: Text("DÃ©placez la carte pour positionner le centre, puis ajoutez un point.", 
                    textAlign: TextAlign.center, style: ZiriaText.bodySmall(color: Colors.white)),
              ),
            ),
            Positioned(
              bottom: 40,
              left: 20, right: 20,
              child: Row(
                children: [
                  Expanded(
                    child: ZirGradientButton(
                      label: 'Ajouter Point',
                      icon: Icons.add_location_alt_rounded,
                      onPressed: _addPoint,
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: _finishDrawing,
                    child: Container(
                      width: 56, height: 56,
                      decoration: BoxDecoration(
                        color: ZiriaColors.accentEmerald,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: ZiriaShadows.emeraldGlow,
                      ),
                      child: const Icon(Icons.check, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () => setState(() { _drawMode = 'none'; _drawnPoints = []; }),
                    child: Container(
                      width: 56, height: 56,
                      decoration: BoxDecoration(
                        color: ZiriaColors.errorRed.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.close, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // â”€â”€ Selected Parcel Detail
          if (ref.watch(selectedParcelProvider) != null && _drawMode == 'none')
            _buildParcelOverlay(ref.watch(selectedParcelProvider)!),
        ],
      ),
      floatingActionButton: (_drawMode == 'none' && !_offlineMode)
          ? FloatingActionButton.extended(
              backgroundColor: ZiriaColors.accentEmerald,
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  backgroundColor: Colors.transparent,
                  builder: (ctx) => ZirGlassCard(
                    margin: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ListTile(
                          leading: const Icon(Icons.draw_rounded, color: Colors.white),
                          title: const Text('Dessiner manuellement', style: TextStyle(color: Colors.white)),
                          onTap: () {
                            Navigator.pop(ctx);
                            _startDrawing('parcel');
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.gps_fixed_rounded, color: Colors.white70),
                          title: const Text('Arpenter sur le terrain (GPS)', style: TextStyle(color: Colors.white70)),
                          subtitle: const Text('BientÃ´t disponible', style: TextStyle(color: Colors.white38, fontSize: 10)),
                          onTap: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                  )
                );
              },
              label: const Text('Nouvelle parcelle', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              icon: const Icon(Icons.add_rounded, color: Colors.white),
            )
          : null,
    );
  }

  Widget _buildMap(ParcelMapData? data, bool isDark) {
    final tileUrl = _useSatellite
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : (isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');

    List<Polygon> polygons = [];
    List<Polygon> zones = [];
    List<Polygon> pulses = [];
    List<Marker> markers = [];

    if (data != null) {
      for (var p in data.parcels) {
        final col = hexToColor(p.colorHex);
        if (p.points.isNotEmpty) {
          polygons.add(Polygon(
            points: p.points,
            color: col.withOpacity(0.2),
            borderColor: col,
            borderStrokeWidth: 2.0,
          ));

          if (p.alertLevel == 'CRITICAL') {
            pulses.add(Polygon(
              points: p.points,
              color: Colors.transparent,
              borderColor: ZiriaColors.errorRed,
              borderStrokeWidth: 4,
            ));
          }
        }

        if (p.centerLat != 0) {
          markers.add(Marker(
            point: LatLng(p.centerLat, p.centerLng),
            width: 140, height: 44,
            child: _buildParcelMarker(p),
          ));
        }

        for (var z in p.cropZones) {
          if (z.points.isNotEmpty) {
            zones.add(Polygon(
              points: z.points,
              color: hexToColor(z.colorHex).withOpacity(0.35),
              borderColor: hexToColor(z.colorHex).withOpacity(0.7),
              borderStrokeWidth: 1.0,
            ));
          }
        }
      }
    }

    if (_drawnPoints.isNotEmpty) {
      polygons.add(Polygon(
        points: [..._drawnPoints, _drawnPoints.last],
        color: ZiriaColors.accentEmerald.withOpacity(0.25),
        borderColor: ZiriaColors.accentEmerald,
        borderStrokeWidth: 2.5,
      ));
    }

    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: const LatLng(35.1674, 8.8362),
        initialZoom: 14.0,
        interactionOptions: const InteractionOptions(flags: InteractiveFlag.all),
        onTap: _onMapTap,
      ),
      children: [
        TileLayer(retinaMode: RetinaMode.isHighDensity(context), urlTemplate: tileUrl, subdomains: const ['a', 'b', 'c', 'd']),
        PolygonLayer(polygons: polygons),
        PolygonLayer(polygons: zones),
        AnimatedBuilder(
          animation: _pulseController,
          builder: (ctx, child) {
            final w = 1.0 + (_pulseController.value * 5);
            return PolygonLayer(
              polygons: pulses.map((p) => Polygon(
                points: p.points,
                color: Colors.transparent,
                borderColor: ZiriaColors.errorRed.withOpacity(1 - _pulseController.value),
                borderStrokeWidth: w,
              )).toList(),
            );
          }
        ),
        if (_drawMode != 'none')
          CircleLayer(
            circles: _drawnPoints.map((pt) => CircleMarker(point: pt, radius: 4, color: Colors.white, borderColor: Colors.blue, borderStrokeWidth: 2)).toList()
          ),
        MarkerLayer(markers: markers),
      ],
    );
  }

  Widget _buildParcelMarker(ParcelWithZones p) {
    final col = hexToColor(p.colorHex);
    return Center(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.75),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: col.withOpacity(0.5)),
          boxShadow: [BoxShadow(color: col.withOpacity(0.2), blurRadius: 4)],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.name, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                Text('${p.areaHa.toStringAsFixed(1)} ha', style: const TextStyle(fontSize: 9, color: Colors.white70)),
              ],
            ),
            if (p.alertLevel == 'CRITICAL') ...[
              const SizedBox(width: 4),
              const Icon(Icons.warning_rounded, color: ZiriaColors.errorRed, size: 12),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildParcelOverlay(ParcelWithZones parcel) {
    return Positioned(
      bottom: 0, left: 0, right: 0,
      child: ZirGlassCard(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(width: 14, height: 14, decoration: BoxDecoration(shape: BoxShape.circle, color: hexToColor(parcel.colorHex))),
                const SizedBox(width: 12),
                Expanded(child: Text(parcel.name, style: ZiriaText.headingMedium())),
                ZirGlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  backgroundColor: Colors.white.withOpacity(0.05),
                  child: Text('${parcel.areaHa.toStringAsFixed(2)} ha', style: ZiriaText.label(color: ZiriaColors.accentEmerald)),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white54, size: 20),
                  onPressed: () => ref.read(selectedParcelProvider.notifier).state = null,
                )
              ],
            ),
            const SizedBox(height: 16),
            Text('ZONES DE CULTURE', style: ZiriaText.label(color: Colors.white38)),
            const SizedBox(height: 12),
            SizedBox(
              height: 100,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: parcel.cropZones.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, i) {
                  final z = parcel.cropZones[i];
                  final zCol = hexToColor(z.colorHex);
                  return Container(
                    width: 150,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: zCol.withOpacity(0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          const Text('ðŸŒ±', style: TextStyle(fontSize: 14)),
                          const SizedBox(width: 4),
                          Expanded(child: Text(z.cropType, style: ZiriaText.label(), overflow: TextOverflow.ellipsis)),
                        ]),
                        const Spacer(),
                        Text('ETA: ${z.harvestEtaDays}j', style: ZiriaText.bodySmall(color: Colors.white70)),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(2),
                          child: LinearProgressIndicator(
                            value: z.gddPercentage / 100,
                            minHeight: 3,
                            backgroundColor: Colors.white10,
                            color: zCol,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ZirGradientButton(
                    label: 'Diagnostic IA',
                    icon: Icons.auto_awesome_rounded,
                    onPressed: () => context.push('/farmer/diagnostic', extra: parcel.id),
                    height: 50,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ZiriaButton(
                    label: 'MarchÃ© SMSA',
                    icon: Icons.storefront_rounded,
                    onPressed: () {},
                    height: 50,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MapControlBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool isDark;

  const _MapControlBtn({required this.icon, required this.onTap, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ZirGlassCard(
        width: 44, height: 44,
        padding: EdgeInsets.zero,
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }
}
