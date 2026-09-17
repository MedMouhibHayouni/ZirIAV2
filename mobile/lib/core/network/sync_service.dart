import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';
import '../database/isar_provider.dart';
import '../database/models/sync_action.dart';
import '../network/api_client.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  final service = SyncService(ref.watch(dioProvider), ref.watch(isarProvider));
  service.init(); // Auto-init
  return service;
});

class SyncService {
  final Dio _dio;
  final Isar _isar;
  StreamSubscription? _connectivitySub;

  SyncService(this._dio, this._isar);

  void init() {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline) {
        processQueue();
      }
    });
  }

  void dispose() {
    _connectivitySub?.cancel();
  }

  Future<void> addToQueue(String endpoint, String method, Map<String, dynamic> payload) async {
    final action = SyncAction(
      endpoint: endpoint,
      method: method,
      payload: jsonEncode(payload),
      createdAt: DateTime.now(),
    );
    
    await _isar.writeTxn(() async {
      await _isar.syncActions.put(action);
    });
    
    // Try to process immediately
    processQueue();
  }

  Future<void> processQueue() async {
    final pending = await _isar.syncActions.where().sortByCreatedAt().findAll();
    if (pending.isEmpty) return;

    for (var action in pending) {
      try {
        final response = await _dio.request(
          action.endpoint,
          data: jsonDecode(action.payload),
          options: Options(method: action.method),
        );

        if (response.statusCode! >= 200 && response.statusCode! < 300) {
          await _isar.writeTxn(() async {
            await _isar.syncActions.delete(action.id);
          });
        }
      } catch (e) {
        await _isar.writeTxn(() async {
          action.retryCount++;
          await _isar.syncActions.put(action);
        });
        break; 
      }
    }
  }
}
