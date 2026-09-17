import 'package:isar/isar.dart';

part 'user_prefs.g.dart';

@collection
class UserPrefs {
  Id id = Isar.autoIncrement;

  String userId;
  bool isDarkMode;
  String languageCode; // 'fr', 'ar', 'dar'

  UserPrefs({
    required this.userId,
    this.isDarkMode = true,
    this.languageCode = 'fr',
  });
}
