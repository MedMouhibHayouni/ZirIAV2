import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider));
});

class AuthRepository {
  final Dio _dio;
  AuthRepository(this._dio);

  /// POST /auth/login → {access_token, user}
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return Map<String, dynamic>.from(response.data);
  }

  /// POST /auth/register
  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String role,
    required String governorate,
  }) async {
    await _dio.post('/auth/register', data: {
      'name': name,
      'email': email,
      'phone': phone,
      'password': password,
      'role': role,
      'governorate': governorate,
    });
  }

  /// GET /auth/me
  Future<Map<String, dynamic>> getMe() async {
    final response = await _dio.get('/auth/me');
    return Map<String, dynamic>.from(response.data);
  }
}
