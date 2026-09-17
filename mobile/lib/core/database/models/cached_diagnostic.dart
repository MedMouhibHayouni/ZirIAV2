import 'package:isar/isar.dart';

part 'cached_diagnostic.g.dart';

@collection
class CachedDiagnostic {
  Id id = Isar.autoIncrement;

  late String userId;
  String? parcelId;
  late String photoPath;
  late String localResultJson;
  late DateTime createdAt;
  late bool isSynced;
}
