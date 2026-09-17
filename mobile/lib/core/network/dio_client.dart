import 'package:dio/dio.dart';
import 'interceptors/network_sync_interceptor.dart';
import '../network/sync_service.dart';

class DioClient {
  final Dio dio;
  final SyncService syncService;

  DioClient({required this.syncService}) : dio = Dio() {
    dio.options.baseUrl = 'https://api.ziria.com/v1'; // Configurable via .env
    dio.options.connectTimeout = const Duration(seconds: 10);
    dio.options.receiveTimeout = const Duration(seconds: 10);

    dio.interceptors.add(NetworkSyncInterceptor(syncService: syncService));
  }

  Dio get client => dio;
}
