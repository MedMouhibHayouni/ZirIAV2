import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/database/isar_provider.dart';
import '../../../core/database/models/cached_parcel.dart';
import 'models/map_data_model.dart';

final parcelRepositoryProvider = Provider<ParcelRepository>((ref) {
  return ParcelRepository(
      ref.watch(apiClientProvider), ref.watch(isarProvider));
});

class ParcelRepository {
  final Dio _dio;
  final Isar _isar; 

  ParcelRepository(this._dio, this._isar);

  Future<ParcelMapData> getMapData() async {
    try {
      final response = await _dio.get('/parcels/map-data');
      final data = response.data;
      final parcelsList = data is List ? data : (data['items'] ?? []);
      
      // Update cache in background
      _syncToIsar(parcelsList as List);

      return ParcelMapData.fromJson(parcelsList);
    } catch (e) {
      // Fallback to Isar
      try {
        final cached = await _isar.cachedParcels.where().findAll();
        if (cached.isNotEmpty) {
          final parcels = cached.map((c) {
            Map<String, dynamic>? geojson;
            try { geojson = jsonDecode(c.boundary); } catch (_) {}
            
            return ParcelWithZones(
              id: c.remoteId,
              name: c.name,
              colorHex: '#2D6A4F',
              areaHa: c.areaHa,
              centerLat: 0.0,
              centerLng: 0.0,
              points: _parseGeoJsonToPoints(geojson),
              alertLevel: c.hasRisk ? 'CRITICAL' : 'NORMAL',
              cropZones: [],
            );
          }).toList();
          return ParcelMapData(parcels: parcels);
        }
      } catch (_) {}
      
      throw Exception('Erreur de chargement des données et aucun cache local disponible.');
    }
  }

  Future<void> createParcel(Map<String, dynamic> data) async {
    try {
      await _dio.post('/parcels', data: data);
    } catch (e) {
      throw Exception('Erreur lors de la création de la parcelle');
    }
  }

  Future<void> updateBoundary(String parcelId, Map<String, dynamic> geojson) async {
    try {
      await _dio.patch('/parcels/$parcelId/boundary', data: {
        'boundary_geojson': geojson,
      });
    } catch (e) {
      throw Exception('Erreur lors de la sauvegarde de la bordure');
    }
  }

  Future<void> _syncToIsar(List<dynamic> items) async {
    try {
      final cachedList = items.map((e) {
        final Map<String, dynamic>? boundary = e['boundary_geojson'];
        return CachedParcel(
          remoteId: e['id'].toString(),
          name: e['name']?.toString() ?? 'Sans nom',
          governorate: e['governorate']?.toString() ?? 'Inconnu',
          areaHa: double.tryParse(e['area_ha']?.toString() ?? '0') ?? 0.0,
          boundary: boundary != null ? jsonEncode(boundary) : '',
          hasRisk: e['alert_level'] == 'CRITICAL',
          ownerId: e['user_id']?.toString() ?? '',
          syncedAt: DateTime.now(),
        );
      }).toList();

      await _isar.writeTxn(() async {
        await _isar.cachedParcels.putAllByRemoteId(cachedList);
      });
    } catch (_) {}
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
