import 'package:isar/isar.dart';

part 'cached_notification.g.dart';

@collection
class CachedNotification {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  String remoteId;

  String title;
  String body;
  String type; // METEO, ALERTE, MARKETPLACE...
  
  bool isRead;
  DateTime createdAt;

  CachedNotification({
    required this.remoteId,
    required this.title,
    required this.body,
    required this.type,
    required this.isRead,
    required this.createdAt,
  });
}
