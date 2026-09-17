import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'interceptors/auth_interceptor.dart';

// Base URL: use Android emulator localhost alias by default
const String _kBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

/// Singleton Dio provider with auth + logging interceptors.
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: _kBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  // Auth token injection + 401 handling
  dio.interceptors.add(AuthInterceptor(ref));

  // Development log interceptor
  dio.interceptors.add(LogInterceptor(
    requestBody: false,
    responseBody: false,
    error: true,
    logPrint: (o) => print('[Dio] $o'),
  ));

  return dio;
});
