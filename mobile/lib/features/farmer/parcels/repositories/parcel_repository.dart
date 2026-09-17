import 'package:dio/dio.dart';
import 'package:isar/isar.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/network/api_client_provider.dart';
import '../../../../core/database/isar_provider.dart';

part 'parcel_repository.g.dart';

// Supposons qu'il existe un modèle Parcel annoté pour Isar
// import '../models/parcel.dart';
// MOCK pour l'exemple
@collection
class Parcel {
  Id id = Isar.autoIncrement;
  late String remoteId;
  late String name;
  late double surface;
  late String cropType;
}

class ParcelRepository {
  final Dio _dio;
  final Isar _isar;

  ParcelRepository(this._dio, this._isar);

  /// Implémente la logique "Cache-First"
  Stream<List<Parcel>> getMyParcels() async* {
    // 1. Lire la base locale Isar en premier (instantané)
    final localParcels = await _isar.parcels.where().findAll();
    if (localParcels.isNotEmpty) {
      yield localParcels;
    }

    // 2. Faire l'appel HTTP en arrière-plan
    try {
      final response = await _dio.get('/parcels/my');
      final List<dynamic> data = response.data;

      final remoteParcels = data
          .map((json) => Parcel()
            ..remoteId = json['id']
            ..name = json['name']
            ..surface = (json['surface'] as num).toDouble()
            ..cropType = json['cropType'] ?? 'Inconnu')
          .toList();

      // 3. Mettre à jour Isar et rafraîchir
      await _isar.writeTxn(() async {
        await _isar.parcels.clear(); // ou un merge plus intelligent
        await _isar.parcels.putAll(remoteParcels);
      });

      yield await _isar.parcels.where().findAll();
    } catch (e) {
      // Si l'appel réseau échoue (offline), on ne fait rien, le cache a déjà été yield
      if (localParcels.isEmpty) {
        throw Exception('Impossible de récupérer les parcelles (hors-ligne)');
      }
    }
  }
}

@riverpod
ParcelRepository parcelRepository(ParcelRepositoryRef ref) {
  final dio = ref.watch(apiClientProvider);
  final isar = ref.watch(isarProvider);
  return ParcelRepository(dio, isar);
}
