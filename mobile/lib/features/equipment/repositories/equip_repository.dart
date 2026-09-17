import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/network/api_client_provider.dart';

part 'equip_repository.g.dart';

class EquipRepository {
  final Dio _dio;

  EquipRepository(this._dio);

  Future<List<dynamic>> getMyEquipment() async {
    try {
      final response = await _dio.get('/equipment/my');
      return response.data;
    } catch (e) {
      throw Exception('Erreur lors du chargement de la flotte');
    }
  }

  Future<List<dynamic>> getPendingReservations() async {
    try {
      final response = await _dio.get('/equipment/reservations/pending');
      return response.data;
    } catch (e) {
      throw Exception('Erreur lors du chargement des demandes');
    }
  }

  Future<void> respondToRequest(String id, String status) async {
    try {
      await _dio.post(
        '/equipment/reservations/$id/respond',
        data: {'status': status}, // 'CONFIRMED' ou 'REJECTED'
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        throw Exception(
            'Conflit : Cet équipement est déjà réservé pour ces dates.');
      }
      throw Exception('Échec de la réponse à la demande');
    } catch (e) {
      throw Exception('Une erreur est survenue');
    }
  }
}

@riverpod
EquipRepository equipRepository(EquipRepositoryRef ref) {
  final dio = ref.watch(apiClientProvider);
  return EquipRepository(dio);
}
