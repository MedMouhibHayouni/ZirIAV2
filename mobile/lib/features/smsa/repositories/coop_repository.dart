import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/network/api_client_provider.dart';

part 'coop_repository.g.dart';

class CoopRepository {
  final Dio _dio;

  CoopRepository(this._dio);

  Future<List<dynamic>> getMembers() async {
    try {
      final response = await _dio.get('/cooperatives/my/members');
      return response.data;
    } catch (e) {
      throw Exception('Impossible de récupérer la liste des membres');
    }
  }

  Future<void> broadcastToMembers(String message) async {
    try {
      await _dio.post(
        '/cooperatives/my/broadcast',
        data: {'message': message},
      );
    } catch (e) {
      throw Exception('Échec de l\'envoi du message broadcast');
    }
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final response = await _dio.get('/cooperatives/my/stats');
      return response.data;
    } catch (e) {
      throw Exception('Impossible de récupérer les statistiques');
    }
  }

  Future<List<dynamic>> getActivityFeed() async {
    try {
      final response = await _dio.get('/cooperatives/my/activity');
      return response.data;
    } catch (e) {
      throw Exception('Impossible de récupérer le flux d\'activité');
    }
  }
}

@riverpod
CoopRepository coopRepository(CoopRepositoryRef ref) {
  final dio = ref.watch(apiClientProvider);
  return CoopRepository(dio);
}
