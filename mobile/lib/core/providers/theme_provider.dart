import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isar/isar.dart';
import '../database/models/user_prefs.dart';

// ─── Notifier ─────────────────────────────────────────────────────────────────
class ThemeNotifier extends StateNotifier<ThemeMode> {
  ThemeNotifier(this._isar, bool isDark)
      : super(isDark ? ThemeMode.dark : ThemeMode.light);

  final Isar _isar;

  bool get isDark => state == ThemeMode.dark;

  Future<void> toggle() async {
    final newIsDark = state != ThemeMode.dark;
    state = newIsDark ? ThemeMode.dark : ThemeMode.light;

    await _isar.writeTxn(() async {
      final prefs = await _isar.userPrefs.where().findFirst();
      if (prefs != null) {
        prefs.isDarkMode = newIsDark;
        await _isar.userPrefs.put(prefs);
      }
    });
  }

  Future<void> setDark(bool isDark) async {
    state = isDark ? ThemeMode.dark : ThemeMode.light;
    await _isar.writeTxn(() async {
      final prefs = await _isar.userPrefs.where().findFirst();
      if (prefs != null) {
        prefs.isDarkMode = isDark;
        await _isar.userPrefs.put(prefs);
      }
    });
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
final themeNotifierProvider =
    StateNotifierProvider<ThemeNotifier, ThemeMode>((ref) {
  // This should be overridden in main.dart after Isar is ready
  throw UnimplementedError('themeNotifierProvider not initialized');
});

// Helper to read isDark from Isar at startup
Future<bool> loadThemePreference(Isar isar) async {
  final prefs = await isar.userPrefs.where().findFirst();
  return prefs?.isDarkMode ?? true; // default: dark
}
