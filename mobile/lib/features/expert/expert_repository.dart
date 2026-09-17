import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final expertRepositoryProvider = Provider<ExpertRepository>((ref) {
  return ExpertRepository(ref.watch(apiClientProvider));
});

class ExpertRepository {
  final Dio _dio;
  ExpertRepository(this._dio);

  Future<List<Map<String, dynamic>>> getPendingValidations() async {
    try {
      final response = await _dio.get('/expert/validations');
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      throw Exception('Impossible de charger les validations en attente');
    }
  }

  Future<void> submitValidation(
      String detectionId, bool approved, String? note) async {
    try {
      await _dio.post('/expert/validations/$detectionId', data: {
        'approved': approved,
        'correction_note': note,
      });
    } catch (e) {
      throw Exception('Erreur lors de la validation');
    }
  }

  Future<List<Map<String, dynamic>>> getHeatmapData() async {
    try {
      final response = await _dio.get('/expert/heatmap');
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      throw Exception('Impossible de charger la heatmap');
    }
  }
}
