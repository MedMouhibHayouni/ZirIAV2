import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/theme/app_theme.dart';
import 'core/providers/theme_provider.dart';
import 'core/routing/app_router.dart';
import 'core/database/isar_provider.dart';
import 'core/network/sync_service.dart';

// import 'package:firebase_core/firebase_core.dart';
// import 'core/services/fcm_service.dart';
import 'core/network/sync_dispatcher.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase (Bypassed for Windows build stability)
  // await Firebase.initializeApp();

  // 1. Initialize offline Isar database
  await IsarDatabase.init();
  final isar = IsarDatabase.instance;

  // 2. Load theme preference before app starts
  final isDarkMode = await loadThemePreference(isar);

  final container = ProviderContainer(
    overrides: [
      isarProvider.overrideWithValue(isar),
      // Initialize theme notifier with the loaded preference
      themeNotifierProvider.overrideWith((ref) => ThemeNotifier(isar, isDarkMode)),
    ],
  );

  // 3. Initialize background sync service
  container.read(syncServiceProvider);
  
  // 4. Initialize FCM (Bypassed for Windows)
  // await container.read(fcmServiceProvider).initialize();
  
  // 5. Initialize offline Sync Dispatcher
  container.read(syncDispatcherProvider);

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const ZirIAApp(),
    ),
  );
}

class ZirIAApp extends ConsumerWidget {
  const ZirIAApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final themeMode = ref.watch(themeNotifierProvider);

    return MaterialApp.router(
      title: 'ZirIA Sentinel',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('fr', 'FR'), // Français (défaut)
        Locale('ar', 'TN'), // Arabe Tunisien
      ],
    );
  }
}