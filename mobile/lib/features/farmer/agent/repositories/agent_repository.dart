import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/network/api_client.dart';

part 'agent_repository.g.dart';

@riverpod
AgentRepository agentRepository(AgentRepositoryRef ref) {
  return AgentRepository(ref.watch(dioProvider));
}

class AgentRepository {
  final Dio _dio;
  AgentRepository(this._dio);

  Future<Map<String, dynamic>> sendMessage(String text, {String? sessionId}) async {
    try {
      final response = await _dio.post('/agent/message', data: {
        'text': text,
        'session_id': sessionId,
      });
      return response.data;
    } catch (e) {
      throw Exception('Impossible de contacter ZirPulse.');
    }
  }

  Future<List<Map<String, dynamic>>> getConversations() async {
    try {
      final response = await _dio.get('/agent/conversations');
      final data = response.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      if (data is Map && data['items'] is List) return (data['items'] as List).cast<Map<String, dynamic>>();
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getSessionMessages(String sessionId) async {
    try {
      final response = await _dio.get('/agent/conversations/$sessionId/messages');
      final data = response.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      if (data is Map && data['items'] is List) return (data['items'] as List).cast<Map<String, dynamic>>();
      return [];
    } catch (e) {
      return [];
    }
  }
}
