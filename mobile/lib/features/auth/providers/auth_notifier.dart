import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../domain/auth_state.dart';
import '../repositories/auth_repository.dart';

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;
  final _storage = const FlutterSecureStorage();

  AuthNotifier(this._repo) : super(const AuthState()) {
    checkAuth(); // Auto-check on creation
  }

  Future<void> checkAuth() async {
    // Keep isLoading true while checking
    try {
      final token = await _storage.read(key: 'jwt_token');
      final userStr = await _storage.read(key: 'user_data');

      if (token != null && token.isNotEmpty && userStr != null) {
        final user = jsonDecode(userStr);
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
        );
      } else {
        state = state.copyWith(isLoading: false, isAuthenticated: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, isAuthenticated: false);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final data = await _repo.login(email, password);

      await _storage.write(key: 'jwt_token', value: data['access_token']);
      await _storage.write(key: 'user_data', value: jsonEncode(data['user']));

      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        user: data['user'],
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: false,
        error: 'Échec de la connexion. Vérifiez vos identifiants.',
      );
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
    await _storage.delete(key: 'user_data');
    state = const AuthState(isLoading: false, isAuthenticated: false);
  }
}
