import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client_provider.dart';
import '../theme/app_theme.dart';

final unreadNotificationsProvider = FutureProvider.autoDispose<int>((ref) async {
  final dio = ref.watch(apiClientProvider);
  try {
    final response = await dio.get('/notifications/unread-count');
    return response.data['count'] as int;
  } catch (e) {
    return 0; // Fallback silently on error
  }
});

class NotificationBell extends ConsumerWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCountAsync = ref.watch(unreadNotificationsProvider);

    return IconButton(
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          const Icon(Icons.notifications_outlined),
          unreadCountAsync.when(
            data: (count) {
              if (count == 0) return const SizedBox.shrink();
              return Positioned(
                right: -4,
                top: -4,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: ZiriaColors.errorRed,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: Center(
                    child: Text(
                      count > 99 ? '99+' : count.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      onPressed: () {
        // We will define this route later, typically it will be within the shell
        // For now we will just emit a refresh to the provider
        ref.invalidate(unreadNotificationsProvider);
        // Navigate to alerts tab depending on the role. We'll handle this in the Shells.
        // E.g., context.go('/farmer/alerts'); 
      },
    );
  }
}
