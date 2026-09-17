import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final alertsRepositoryProvider = Provider<AlertsRepository>((ref) {
  return AlertsRepository(ref.watch(apiClientProvider));
});

class AlertsRepository {
  final Dio _dio;
  AlertsRepository(this._dio);

  Future<List<Map<String, dynamic>>> getMyNotifications() async {
    try {
      final response = await _dio.get('/notifications');
      return List<Map<String, dynamic>>.from(response.data['items'] ?? []);
    } catch (e) {
      throw Exception('Impossible de charger les alertes');
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _dio.patch('/notifications/$id/read');
    } catch (e) {
      // Ignore gracefully
    }
  }
}
