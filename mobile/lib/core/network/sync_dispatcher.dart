import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:isar/isar.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:ziria_mobile/core/database/isar_provider.dart';
import 'package:ziria_mobile/core/database/models/sync_action.dart';
import 'package:ziria_mobile/core/database/models/cached_notification.dart';
import 'package:ziria_mobile/core/network/api_client.dart';

part 'sync_dispatcher.g.dart';

@riverpod
class SyncDispatcher extends _$SyncDispatcher {
  @override
  int build() {
    // Listen to connectivity changes
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection) {
        _dispatchPending();
      }
    });
    
    // Initial dispatch if online
    Future.microtask(() async {
      final results = await Connectivity().checkConnectivity();
      if (results.any((r) => r != ConnectivityResult.none)) {
        _dispatchPending();
      }
    });

    _updateCount();
    return 0; // The count of pending sync actions
  }

  void _updateCount() {
    final isar = IsarDatabase.instance;
    final count = isar.syncActions.countSync();
    state = count;
  }

  Future<void> _dispatchPending() async {
    final isar = IsarDatabase.instance;
    final pendingActions = await isar.syncActions.where().sortByCreatedAt().findAll();
    
    if (pendingActions.isEmpty) return;

    final dio = ref.read(dioProvider);

    for (final action in pendingActions) {
      try {
        await dio.request(
          action.endpoint,
          data: action.payload,
          options: Options(
            method: action.method,
          ),
        );
        
        // Success: delete from Isar
        await isar.writeTxn(() async {
          await isar.syncActions.delete(action.id);
        });

      } on DioException catch (e) {
        // Handle client errors (e.g. 409 Conflict, 404 Not Found, 422 Unprocessable Entity)
        if (e.response != null && [404, 409, 422].contains(e.response?.statusCode)) {
          await isar.writeTxn(() async {
            await isar.syncActions.delete(action.id);
            
            // Generate a CachedNotification so user sees what failed
            final notif = CachedNotification(
              remoteId: 'sync_err_${action.id}',
              type: 'SYNC_ERROR',
              title: 'Erreur de synchronisation',
              body: 'L\'action "${action.method} ${action.endpoint}" a échoué: ${e.response?.statusCode}',
              isRead: false,
              createdAt: DateTime.now(),
            );
            await isar.cachedNotifications.put(notif);
          });
        }
      } catch (e) {
        // Other unexpected errors: keep in queue or log
      }
    }
    
    _updateCount();
  }
}
