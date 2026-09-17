import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final diagnosticRepositoryProvider = Provider<DiagnosticRepository>((ref) {
  return DiagnosticRepository(ref.watch(apiClientProvider));
});

class DiagnosticRepository {
  final Dio _dio;
  DiagnosticRepository(this._dio);

  Future<Map<String, dynamic>> analyzeDisease(
      String photoUrl, String cropType) async {
    try {
      final response = await _dio.post('/disease-detections/analyze', data: {
        'photo_url': photoUrl,
        'crop_type': cropType,
        // Optional weather info could be added here
      });
      return response.data;
    } catch (e) {
      throw Exception('Erreur lors de l\'analyse de la maladie');
    }
  }

  Future<List<Map<String, dynamic>>> getMyDiagnostics() async {
    try {
      final response = await _dio.get('/disease-detections/my');
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      throw Exception('Impossible de récupérer l\'historique des diagnostics');
    }
  }
}
