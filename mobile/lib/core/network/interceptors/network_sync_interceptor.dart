import 'dart:io';
import 'package:dio/dio.dart';
import '../sync_service.dart';

class NetworkSyncInterceptor extends Interceptor {
  final SyncService syncService;

  NetworkSyncInterceptor({required this.syncService});

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    // Detect network-related errors (offline)
    final isNetworkError = err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        err.error is SocketException;

    // Only intercept mutative actions
    final isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].contains(err.requestOptions.method.toUpperCase());

    if (isNetworkError && isWriteMethod) {
      // 1. Enregistrer dans Isar (Offline Sync Queue)
      await syncService.addToQueue(
        err.requestOptions.path,
        err.requestOptions.method,
        err.requestOptions.data is Map<String, dynamic> ? err.requestOptions.data : {},
      );

      // 2. Retourner une réponse "Optimiste" (HTTP 202 Accepted)
      return handler.resolve(
        Response(
          requestOptions: err.requestOptions,
          statusCode: 202,
          data: {
            'status': 'queued', 
            'message': 'Action sauvegardée hors-ligne. Synchronisation en attente du réseau.'
          },
        ),
      );
    }

    return super.onError(err, handler);
  }
}
