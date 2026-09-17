import 'package:isar/isar.dart';

part 'cached_parcel.g.dart';

@collection
class CachedParcel {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  String remoteId;

  String name;
  String governorate;
  double areaHa;
  
  // Boundary GeoJSON string
  String boundary;

  bool hasRisk;
  String ownerId;

  DateTime syncedAt;

  CachedParcel({
    required this.remoteId,
    required this.name,
    required this.governorate,
    required this.areaHa,
    required this.boundary,
    required this.hasRisk,
    required this.ownerId,
    required this.syncedAt,
  });
}
