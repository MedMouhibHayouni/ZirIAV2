import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'connectivity_notifier.g.dart';

@Riverpod(keepAlive: true)
class ConnectivityNotifier extends _$ConnectivityNotifier {
  @override
  bool build() {
    // Listen to network changes
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      final isOnline = !results.contains(ConnectivityResult.none);
      state = isOnline;
    });

    // Check initial state asynchronously without blocking build
    _checkInitialState();

    return true; // Default to true (online) while checking
  }

  Future<void> _checkInitialState() async {
    final results = await Connectivity().checkConnectivity();
    final isOnline = !results.contains(ConnectivityResult.none);
    state = isOnline;
  }
}
