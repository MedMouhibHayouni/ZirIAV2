import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'api_client_provider.dart';

part 'fcm_service.g.dart';

// Stub class for Windows build stability
class FCMService {
  final Dio _dio;

  FCMService(this._dio);

  Future<void> initialize() async {
    debugPrint('FCM: Service stubbed for this platform');
  }

  Future<void> sendTokenToBackend(String token) async {
    // Stubbed
  }
}

@riverpod
FCMService fcmService(FcmServiceRef ref) {
  final dio = ref.watch(apiClientProvider);
  return FCMService(dio);
}
