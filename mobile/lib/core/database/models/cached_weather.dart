import 'package:isar/isar.dart';

part 'cached_weather.g.dart';

@collection
class CachedWeather {
  Id id = Isar.autoIncrement;

  late double lat;
  late double lng;
  late DateTime fetchedAt;
  late String forecastJson;
}
