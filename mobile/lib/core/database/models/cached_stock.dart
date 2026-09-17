import 'package:isar/isar.dart';

part 'cached_stock.g.dart';

@collection
class CachedStock {
  Id id = Isar.autoIncrement;

  late String ownerId;
  late String cropType;
  late double quantityKg;
  late String unit;
  late DateTime updatedAt;
}
