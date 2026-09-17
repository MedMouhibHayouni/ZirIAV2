import 'package:isar/isar.dart';

part 'sync_action.g.dart';

@collection
class SyncAction {
  Id id = Isar.autoIncrement;

  String endpoint;
  String method; // POST, PATCH, DELETE
  
  // JSON encoded payload
  String payload;
  
  DateTime createdAt;
  int retryCount;

  SyncAction({
    required this.endpoint,
    required this.method,
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
  });
}
