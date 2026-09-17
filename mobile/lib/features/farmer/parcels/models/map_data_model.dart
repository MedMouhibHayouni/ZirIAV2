import 'package:latlong2/latlong.dart';

class ParcelMapData {
  final List<ParcelWithZones> parcels;

  ParcelMapData({required this.parcels});

  factory ParcelMapData.fromJson(List<dynamic> jsonList) {
    return ParcelMapData(
      parcels: jsonList.map((e) => ParcelWithZones.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class ParcelWithZones {
  final String id;
  final String name;
  final String colorHex;
  final double areaHa;
  final double centerLat;
  final double centerLng;
  final List<LatLng> points;
  final String alertLevel;
  final List<CropZoneMap> cropZones;
  final Map<String, dynamic>? weather3Days;
  final Map<String, dynamic>? lastDetection;

  ParcelWithZones({
    required this.id,
    required this.name,
    required this.colorHex,
    required this.areaHa,
    required this.centerLat,
    required this.centerLng,
    required this.points,
    required this.alertLevel,
    required this.cropZones,
    this.weather3Days,
    this.lastDetection,
  });

  factory ParcelWithZones.fromJson(Map<String, dynamic> json) {
    return ParcelWithZones(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Sans nom',
      colorHex: json['color_hex']?.toString() ?? '#2D6A4F',
      areaHa: double.tryParse(json['area_ha']?.toString() ?? '0') ?? 0.0,
      centerLat: double.tryParse(json['center_lat']?.toString() ?? '0') ?? 0.0,
      centerLng: double.tryParse(json['center_lng']?.toString() ?? '0') ?? 0.0,
      points: _parseGeoJsonToPoints(json['boundary_geojson'] as Map<String, dynamic>?),
      alertLevel: json['alert_level']?.toString() ?? 'NORMAL',
      cropZones: (json['crop_zones'] as List<dynamic>?)
              ?.map((e) => CropZoneMap.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      weather3Days: json['weather'] as Map<String, dynamic>?,
      lastDetection: json['last_detection'] as Map<String, dynamic>?,
    );
  }
}

class CropZoneMap {
  final String id;
  final String cropType;
  final String colorHex;
  final List<LatLng> points;
  final double gddPercentage;
  final int harvestEtaDays;
  final String alertLevel;

  CropZoneMap({
    required this.id,
    required this.cropType,
    required this.colorHex,
    required this.points,
    required this.gddPercentage,
    required this.harvestEtaDays,
    required this.alertLevel,
  });

  factory CropZoneMap.fromJson(Map<String, dynamic> json) {
    return CropZoneMap(
      id: json['id']?.toString() ?? '',
      cropType: json['crop_type']?.toString() ?? 'UNKNOWN',
      colorHex: json['color_hex']?.toString() ?? '#FFFFFF',
      points: _parseGeoJsonToPoints(json['boundary_geojson'] as Map<String, dynamic>?),
      gddPercentage: double.tryParse(json['gdd_percentage']?.toString() ?? '0') ?? 0.0,
      harvestEtaDays: int.tryParse(json['harvest_eta_days']?.toString() ?? '0') ?? 0,
      alertLevel: json['alert_level']?.toString() ?? 'NORMAL',
    );
  }
}

List<LatLng> _parseGeoJsonToPoints(Map<String, dynamic>? geojson) {
  if (geojson == null || geojson['type'] != 'Polygon') return [];
  final coordinates = geojson['coordinates'] as List<dynamic>?;
  if (coordinates == null || coordinates.isEmpty) return [];
  
  final ring = coordinates.first as List<dynamic>;
  return ring.map((pt) {
    final point = pt as List<dynamic>;
    return LatLng(point[1] as double, point[0] as double);
  }).toList();
}
