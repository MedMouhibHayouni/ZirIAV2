import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';

import 'models/user_prefs.dart';
import 'models/cached_parcel.dart';
import 'models/cached_notification.dart';
import 'models/sync_action.dart';

import 'models/cached_stock.dart';
import 'models/cached_diagnostic.dart';
import 'models/cached_weather.dart';

final isarProvider = Provider<Isar>((ref) {
  throw UnimplementedError('Isar is not initialized yet.');
});

class IsarDatabase {
  static late Isar instance;

  static Future<void> init() async {
    final dir = await getApplicationDocumentsDirectory();
    instance = await Isar.open(
      [
        UserPrefsSchema,
        CachedParcelSchema,
        CachedNotificationSchema,
        SyncActionSchema,
        CachedStockSchema,
        CachedDiagnosticSchema,
        CachedWeatherSchema,
      ],
      directory: dir.path,
    );
  }
}
