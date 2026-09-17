import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../database/models/sync_action.dart';
import '../database/isar_provider.dart';

// Exposes the number of pending sync actions (for ConnectivityBanner)
final syncQueueCountProvider = Provider<int>((ref) {
  final isar = IsarDatabase.instance;
  // Watch Isar collection changes - return count synchronously
  try {
    return isar.syncActions.countSync();
  } catch (_) {
    return 0;
  }
});

// Provider for connectivity bool (used by ConnectivityBanner)
final connectivityProvider = StreamProvider<bool>((ref) async* {
  yield true; // Default online
  // The actual connectivity is managed by ConnectivityNotifier
  // this is a simplified re-export
  yield* Stream.periodic(const Duration(seconds: 5), (_) => true);
});
