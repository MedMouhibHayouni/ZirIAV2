// import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// import 'package:ziria_mobile/core/database/isar_provider.dart';
// import 'package:ziria_mobile/core/database/models/cached_notification.dart';

final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService();
});

class FcmService {
  Future<void> initialize() async {
    // Firebase Messaging bypassed for Windows build stability
    print('[FCM] Service bypassed (Windows)');
    return;
    
    /* 
    final messaging = FirebaseMessaging.instance;

    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      final isar = IsarDatabase.instance;
      
      await isar.writeTxn(() async {
        final notif = CachedNotification()
          ..type = message.data['type'] ?? 'GENERAL'
          ..title = message.notification?.title ?? 'Nouvelle notification'
          ..body = message.notification?.body ?? ''
          ..isRead = false
          ..createdAt = DateTime.now();
          
        await isar.cachedNotifications.put(notif);
      });
    });
    */
  }
}
